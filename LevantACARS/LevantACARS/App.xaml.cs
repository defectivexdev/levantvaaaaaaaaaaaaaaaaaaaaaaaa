using System.IO;
using System.Windows;
using System.Windows.Threading;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Serilog;
using LevantACARS.Services;
using LevantACARS.ViewModels;

namespace LevantACARS;

public partial class App : Application
{
    private ServiceProvider? _serviceProvider;

    public static ServiceProvider Services { get; private set; } = null!;

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        // ── Load AppConfig from %AppData%/LevantACARS/config.json ────────
        var config = AppConfig.Current;

        // ── Serilog ────────────────────────────────────────────────────────
        try
        {
            var logDir = Path.Combine(AppConfig.GetConfigDirectory(), "logs");
            if (!Directory.Exists(logDir))
                Directory.CreateDirectory(logDir);

            var logPath = Path.Combine(logDir, "levant-acars-.log");

            Log.Logger = new LoggerConfiguration()
                .MinimumLevel.Is(Enum.Parse<Serilog.Events.LogEventLevel>(config.LogLevel))
                .WriteTo.Console()
                .WriteTo.File(logPath, rollingInterval: RollingInterval.Day)
                .CreateLogger();
        }
        catch
        {
            Log.Logger = new LoggerConfiguration()
                .WriteTo.Console()
                .CreateLogger();
        }

        // ── DI Container ───────────────────────────────────────────────────
        var services = new ServiceCollection();
        ConfigureServices(services);
        _serviceProvider = services.BuildServiceProvider();
        Services = _serviceProvider;

        // ── Initialize Discord (safe — catches DllNotFoundException) ──────
        try
        {
            var discord = _serviceProvider.GetRequiredService<DiscordService>();
            discord.Initialize();
        }
        catch (Exception ex)
        {
            Log.Warning(ex, "[App] Discord initialization failed — continuing without Rich Presence");
        }

        // ── Initialize Auth Service ───────────────────────────────────────
        if (config.IsAuthenticated)
        {
            try
            {
                var auth = _serviceProvider.GetRequiredService<AuthService>();
                _ = auth.FetchProfileAsync();
            }
            catch { /* Non-critical */ }
        }

        // ── Show main window ──────────────────────────────────────────────
        var mainWindow = _serviceProvider.GetRequiredService<Views.MainWindow>();
        mainWindow.Show();
    }

    private static void ConfigureServices(IServiceCollection services)
    {
        var config = AppConfig.Current;

        // Logging
        services.AddLogging(builder =>
        {
            builder.ClearProviders();
            builder.AddSerilog(dispose: true);
        });

        // SimBridge (WebView2 ↔ React interop)
        services.AddSingleton<SimBridge>();

        // HTTP Client for Levant VA API (with resilience / retry)
        services.AddHttpClient<LevantApiClient>(client =>
        {
            client.BaseAddress = new Uri(config.ApiBaseUrl);
            client.DefaultRequestHeaders.Add("User-Agent", "Levant-VA-ACARS-v2.0");

            // Use auth token if logged in, otherwise fall back to API key
            if (!string.IsNullOrEmpty(config.AuthToken))
                client.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", config.AuthToken);
            else if (!string.IsNullOrEmpty(config.VaApiKey))
                client.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", config.VaApiKey);

            client.Timeout = TimeSpan.FromSeconds(config.ApiTimeout);
        })
        .AddStandardResilienceHandler();

        // Services (singletons — one per ACARS session)
        services.AddSingleton<FsuipcService>();
        services.AddSingleton<FlightStateMachine>();
        services.AddSingleton<ExceedanceProxy>();
        services.AddSingleton<RunwayDetector>();
        services.AddSingleton<ScoringEngine>();
        services.AddSingleton<FlightManager>();
        services.AddSingleton<DiscordService>();
        services.AddSingleton<DiscordWebhookService>();
        services.AddSingleton<AuthService>();

        // ViewModels (singletons — shared across bridge + services)
        services.AddSingleton<MainViewModel>();
        services.AddSingleton<FlightViewModel>();
        services.AddSingleton<DashboardViewModel>();

        // Views
        services.AddSingleton<Views.MainWindow>();
    }

    protected override void OnExit(ExitEventArgs e)
    {
        try { _serviceProvider?.GetService<DiscordService>()?.Dispose(); } catch { }
        Log.CloseAndFlush();
        _serviceProvider?.Dispose();
        base.OnExit(e);
    }
}
