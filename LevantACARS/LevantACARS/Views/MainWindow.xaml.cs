using System.IO;
using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Web.WebView2.Core;
using LevantACARS.Services;

namespace LevantACARS.Views;

public partial class MainWindow : Window
{
    private readonly IServiceProvider _services;
    private SimBridge? _simBridge;

    public MainWindow(IServiceProvider serviceProvider)
    {
        _services = serviceProvider;

        try
        {
            InitializeComponent();
        }
        catch (Exception ex)
        {
            var inner = ex;
            while (inner.InnerException != null) inner = inner.InnerException;
            MessageBox.Show(
                $"XAML Load Error:\n\n{inner.Message}\n\nFull:\n{ex}",
                "LevantACARS — XAML Error", MessageBoxButton.OK, MessageBoxImage.Error);
            throw;
        }

        // Resolve icon with fallback: favicon.ico → favicon.jpg → logo.png → embedded default
        ResolveWindowIcon();

        Loaded += async (_, _) => await InitWebView2Async();
    }

    /// <summary>
    /// Safety-first icon resolver: tries multiple asset paths, validates each,
    /// and falls back to a generic embedded icon if all fail.
    /// </summary>
    private void ResolveWindowIcon()
    {
        var baseDir = AppContext.BaseDirectory;
        string[] candidates =
        {
            Path.Combine(baseDir, "Assets", "favicon.ico"),
            Path.Combine(baseDir, "Assets", "favicon.jpg"),
            Path.Combine(baseDir, "Assets", "logo.png"),
            Path.Combine(baseDir, "favicon.ico"),
            Path.Combine(baseDir, "favicon.jpg"),
        };

        foreach (var path in candidates)
        {
            if (!File.Exists(path)) continue;
            try
            {
                var info = new FileInfo(path);
                if (info.Length < 100) continue; // Skip corrupt / empty files

                if (path.EndsWith(".ico", StringComparison.OrdinalIgnoreCase))
                {
                    // .ico files must be decoded via BitmapDecoder for WPF Window.Icon
                    using var stream = new FileStream(path, FileMode.Open, FileAccess.Read);
                    var decoder = BitmapDecoder.Create(stream, BitmapCreateOptions.None, BitmapCacheOption.OnLoad);
                    if (decoder.Frames.Count > 0)
                    {
                        var frame = decoder.Frames.OrderByDescending(f => f.PixelWidth).First();
                        frame.Freeze();
                        Icon = frame;
                        return;
                    }
                }
                else
                {
                    // .jpg / .png — use BitmapImage
                    var bmp = new BitmapImage();
                    bmp.BeginInit();
                    bmp.UriSource = new Uri(path, UriKind.Absolute);
                    bmp.CacheOption = BitmapCacheOption.OnLoad;
                    bmp.EndInit();
                    bmp.Freeze();

                    if (bmp.PixelWidth > 0 && bmp.PixelHeight > 0)
                    {
                        Icon = bmp;
                        return;
                    }
                }
            }
            catch
            {
                // Invalid image — skip and try next candidate
            }
        }

        // All candidates failed — use pack:// embedded resource as last resort
        try
        {
            Icon = BitmapFrame.Create(new Uri("pack://application:,,,/Assets/favicon.jpg", UriKind.Absolute));
        }
        catch
        {
            // No icon at all — window runs without one (still functional)
        }
    }

    private async Task InitWebView2Async()
    {
        try
        {
            // Ensure WebView2 runtime is ready
            await WebView.EnsureCoreWebView2Async();

            var coreWv = WebView.CoreWebView2;

            // Enable native CSS -webkit-app-region: drag for custom title bar dragging
            var settings = coreWv.Settings;
            settings.IsNonClientRegionSupportEnabled = true;
            settings.IsSwipeNavigationEnabled = false;
            settings.IsStatusBarEnabled = false;

            // Map the wwwroot folder as a virtual host so React loads cleanly
            var wwwroot = Path.Combine(AppContext.BaseDirectory, "wwwroot");
            coreWv.SetVirtualHostNameToFolderMapping(
                "levantacars.local",
                wwwroot,
                CoreWebView2HostResourceAccessKind.Allow);

            // Attach SimBridge for COM interop + telemetry streaming
            _simBridge = _services.GetRequiredService<SimBridge>();
            _simBridge.Attach(coreWv);

            // Navigate to the React app
            coreWv.Navigate("https://levantacars.local/index.html");
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                $"WebView2 initialization failed:\n\n{ex.Message}\n\n" +
                "Please ensure the WebView2 Runtime is installed.\n" +
                "Download: https://developer.microsoft.com/en-us/microsoft-edge/webview2/",
                "LevantACARS — WebView2 Error", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    protected override void OnClosed(EventArgs e)
    {
        _simBridge?.Dispose();
        base.OnClosed(e);
    }
}
