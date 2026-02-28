using CommunityToolkit.Mvvm.ComponentModel;
using LevantACARS.Models;
using LevantACARS.Services;

namespace LevantACARS.ViewModels;

/// <summary>
/// Dashboard ViewModel — displays live sim data when no flight is active.
/// </summary>
public partial class DashboardViewModel : ObservableObject
{
    private readonly FlightManager _flightManager;

    [ObservableProperty] private double _latitude;
    [ObservableProperty] private double _longitude;
    [ObservableProperty] private int _altitude;
    [ObservableProperty] private int _radioAltitude;
    [ObservableProperty] private int _heading;
    [ObservableProperty] private int _groundSpeed;
    [ObservableProperty] private int _ias;
    [ObservableProperty] private int _verticalSpeed;
    [ObservableProperty] private double _pitch;
    [ObservableProperty] private double _bank;
    [ObservableProperty] private double _gForce = 1.0;
    [ObservableProperty] private bool _onGround = true;
    [ObservableProperty] private bool _enginesOn;
    [ObservableProperty] private double _totalFuel;
    [ObservableProperty] private int _flapsPosition;
    [ObservableProperty] private int _gearPosition;
    [ObservableProperty] private bool _parkingBrake;
    [ObservableProperty] private int _throttle;
    [ObservableProperty] private bool _stallWarning;
    [ObservableProperty] private bool _overspeedWarning;
    [ObservableProperty] private string _aircraftTitle = "N/A";
    [ObservableProperty] private string _phase = "Preflight";
    [ObservableProperty] private double _simRate = 1.0;
    [ObservableProperty] private bool _isPaused;

    public DashboardViewModel(FlightManager flightManager)
    {
        _flightManager = flightManager;
        _flightManager.OnFlightDataUpdated += OnData;
    }

    private void OnData(FlightData d)
    {
        App.Current.Dispatcher.Invoke(() =>
        {
            Latitude = d.Latitude;
            Longitude = d.Longitude;
            Altitude = d.Altitude;
            RadioAltitude = d.RadioAltitude;
            Heading = d.Heading;
            GroundSpeed = d.GroundSpeed;
            Ias = d.Ias;
            VerticalSpeed = d.VerticalSpeed;
            Pitch = d.Pitch;
            Bank = d.Bank;
            GForce = d.GForce;
            OnGround = d.OnGround;
            EnginesOn = d.EnginesOn;
            TotalFuel = d.TotalFuel;
            FlapsPosition = d.FlapsPosition;
            GearPosition = d.GearPosition;
            ParkingBrake = d.ParkingBrake;
            Throttle = d.Throttle;
            StallWarning = d.StallWarning;
            OverspeedWarning = d.OverspeedWarning;
            AircraftTitle = string.IsNullOrEmpty(d.AircraftTitle) ? "N/A" : d.AircraftTitle;
            Phase = d.Phase.ToString();
            SimRate = d.SimRate;
            IsPaused = d.IsPaused;
        });
    }
}
