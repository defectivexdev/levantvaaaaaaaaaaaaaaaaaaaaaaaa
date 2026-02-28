using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Extensions.DependencyInjection;
using LevantACARS.Models;
using LevantACARS.Services;

namespace LevantACARS.ViewModels;

/// <summary>
/// Root ViewModel — hosts navigation and global state.
/// </summary>
public partial class MainViewModel : ObservableObject
{
    private readonly FlightManager _flightManager;
    private readonly AuthService _authService;

    [ObservableProperty] private bool _isSimConnected;
    [ObservableProperty] private bool _isApiConnected;
    [ObservableProperty] private string _connectionStatus = "Disconnected";
    [ObservableProperty] private string _currentView = "Dashboard";

    // Auth / Profile
    [ObservableProperty] private bool _isLoggedIn;
    [ObservableProperty] private string _pilotName = "Not logged in";
    [ObservableProperty] private string _pilotRank = "";
    [ObservableProperty] private string _pilotId = "";
    [ObservableProperty] private string _pilotAvatar = "";
    [ObservableProperty] private double _pilotHours;
    [ObservableProperty] private int _pilotXp;
    [ObservableProperty] private string _weightUnit = "lbs";
    [ObservableProperty] private bool _isLoggingIn;
    [ObservableProperty] private string _deviceCode = "";

    // Child ViewModels
    [ObservableProperty] private DashboardViewModel _dashboard;
    [ObservableProperty] private FlightViewModel _flight;

    public MainViewModel(FlightManager flightManager, DashboardViewModel dashboard, FlightViewModel flight, AuthService authService)
    {
        _flightManager = flightManager;
        _authService = authService;
        _dashboard = dashboard;
        _flight = flight;

        _flightManager.OnConnectionChanged += connected =>
        {
            App.Current.Dispatcher.Invoke(() =>
            {
                IsSimConnected = connected;
                ConnectionStatus = connected ? "Connected" : "Disconnected";
            });
        };

        _authService.OnAuthStateChanged += loggedIn =>
        {
            App.Current.Dispatcher.Invoke(() => RefreshProfile());
        };

        _authService.OnDeviceCodeReady += code =>
        {
            App.Current.Dispatcher.Invoke(() => DeviceCode = code);
        };

        // Load profile from config if already authenticated
        RefreshProfile();

        // If not authenticated, auto-start the device-code login flow
        if (!IsLoggedIn)
        {
            _ = AutoLoginAsync();
        }

        // Initialize
        _ = _flightManager.InitializeAsync();
    }

    private void RefreshProfile()
    {
        var config = AppConfig.Current;
        // Set PilotId BEFORE IsLoggedIn to prevent race condition:
        // PropertyChanged fires on IsLoggedIn → SimBridge pushes auth + fetches bid
        // PilotId must already be populated at that point.
        PilotId = config.PilotId ?? "";
        PilotName = config.PilotName ?? "Not logged in";
        PilotRank = config.PilotRank ?? "";
        PilotAvatar = config.PilotAvatar ?? "";
        PilotHours = config.PilotHours;
        PilotXp = config.PilotXp;
        WeightUnit = string.IsNullOrWhiteSpace(config.WeightUnit) ? "lbs" : config.WeightUnit;
        IsLoggedIn = config.IsAuthenticated;
    }

    [RelayCommand]
    private void NavigateTo(string view)
    {
        CurrentView = view;
    }

    [RelayCommand]
    private async Task LoginAsync()
    {
        if (IsLoggingIn) return;
        IsLoggingIn = true;
        DeviceCode = "";
        try
        {
            await _authService.LoginAsync();
        }
        finally
        {
            IsLoggingIn = false;
        }
    }

    private async Task AutoLoginAsync()
    {
        // Small delay to let the UI render first
        await Task.Delay(500);
        await LoginAsync();
    }

    [RelayCommand]
    private void Logout()
    {
        _authService.Logout();
    }
}
