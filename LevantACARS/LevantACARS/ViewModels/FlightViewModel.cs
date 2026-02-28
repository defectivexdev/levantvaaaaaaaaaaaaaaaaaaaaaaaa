using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using LevantACARS.Models;
using LevantACARS.Services;

namespace LevantACARS.ViewModels;

/// <summary>
/// Flight ViewModel — manages flight dispatch, live tracking, and PIREP results.
/// </summary>
public partial class FlightViewModel : ObservableObject
{
    private readonly FlightManager _flightManager;

    // ── Dispatch Fields ─────────────────────────────────────────────────────
    [ObservableProperty] private string _pilotId = string.Empty;
    [ObservableProperty] private string _flightNumber = string.Empty;
    [ObservableProperty] private string _callsign = string.Empty;
    [ObservableProperty] private string _departureIcao = string.Empty;
    [ObservableProperty] private string _arrivalIcao = string.Empty;
    [ObservableProperty] private string _route = string.Empty;
    [ObservableProperty] private string _aircraftType = string.Empty;
    [ObservableProperty] private string _aircraftRegistration = string.Empty;
    [ObservableProperty] private int _pax;
    [ObservableProperty] private int _cargo;

    // ── Live Flight State ───────────────────────────────────────────────────
    [ObservableProperty] private bool _isFlightActive;
    [ObservableProperty] private string _currentPhase = "Preflight";
    [ObservableProperty] private int _altitude;
    [ObservableProperty] private int _groundSpeed;
    [ObservableProperty] private int _ias;
    [ObservableProperty] private int _verticalSpeed;
    [ObservableProperty] private int _heading;
    [ObservableProperty] private double _gForce = 1.0;
    [ObservableProperty] private double _latitude;
    [ObservableProperty] private double _longitude;
    [ObservableProperty] private int _comfortScore = 100;
    [ObservableProperty] private int _exceedanceCount;
    [ObservableProperty] private string _flightTime = "00:00";
    [ObservableProperty] private double _distanceNm;
    [ObservableProperty] private double _currentFuel;

    // ── Score Result ────────────────────────────────────────────────────────
    [ObservableProperty] private bool _showScoreCard;
    [ObservableProperty] private int _finalScore;
    [ObservableProperty] private string _landingGrade = string.Empty;
    [ObservableProperty] private string _landingDescription = string.Empty;
    [ObservableProperty] private int _xpEarned;
    [ObservableProperty] private bool _flightRejected;
    [ObservableProperty] private string _rejectionReason = string.Empty;

    // ── Activity Log ────────────────────────────────────────────────────────
    public ObservableCollection<string> ActivityLog { get; } = new();
    public ObservableCollection<string> ExceedanceLog { get; } = new();

    private DateTime _flightStartTime;

    public FlightViewModel(FlightManager flightManager)
    {
        _flightManager = flightManager;

        _flightManager.OnFlightDataUpdated += OnFlightData;
        _flightManager.OnPhaseChanged += OnPhaseChanged;
        _flightManager.OnExceedancesDetected += OnExceedances;
        _flightManager.OnFlightScored += OnScored;
        _flightManager.OnFlightEvent += OnEvent;
    }

    [RelayCommand]
    private async Task StartFlight()
    {
        if (string.IsNullOrWhiteSpace(PilotId))
            return;
        // Fall back to Callsign if FlightNumber is empty (server may not always provide it)
        if (string.IsNullOrWhiteSpace(FlightNumber) && !string.IsNullOrWhiteSpace(Callsign))
            FlightNumber = Callsign;

        _flightStartTime = DateTime.UtcNow;
        ShowScoreCard = false;
        ActivityLog.Clear();
        ExceedanceLog.Clear();

        var result = await _flightManager.StartFlightAsync(new FlightManager.StartFlightParams(
            PilotId, FlightNumber, Callsign, DepartureIcao, ArrivalIcao,
            Route, AircraftType, AircraftRegistration, Pax, Cargo));

        IsFlightActive = result;
    }

    [RelayCommand]
    private async Task CancelFlight()
    {
        await _flightManager.CancelFlightAsync();
        IsFlightActive = false;
        ShowScoreCard = false;
        CurrentPhase = "Preflight";
        FlightTime = "00:00";
        ComfortScore = 100;
        ExceedanceCount = 0;
        DistanceNm = 0;
        FinalScore = 0;
        LandingGrade = string.Empty;
        FlightRejected = false;
        RejectionReason = string.Empty;
        ActivityLog.Clear();
        ExceedanceLog.Clear();
        AddActivity("Flight cancelled by pilot");
    }

    [RelayCommand]
    private async Task SubmitFlight()
    {
        var score = await _flightManager.SubmitFlightAsync();
        IsFlightActive = false;
    }

    // ── Event Handlers ──────────────────────────────────────────────────────

    private void OnFlightData(FlightData d)
    {
        App.Current.Dispatcher.Invoke(() =>
        {
            Altitude = d.Altitude;
            GroundSpeed = d.GroundSpeed;
            Ias = d.Ias;
            VerticalSpeed = d.VerticalSpeed;
            Heading = d.Heading;
            GForce = d.GForce;
            Latitude = d.Latitude;
            Longitude = d.Longitude;
            CurrentPhase = d.Phase.ToString();
            ComfortScore = _flightManager.ComfortScore;
            ExceedanceCount = _flightManager.ExceedanceCount;
            CurrentFuel = d.TotalFuel;

            if (_flightStartTime != default)
            {
                var elapsed = DateTime.UtcNow - _flightStartTime;
                FlightTime = $"{(int)elapsed.TotalHours:D2}:{elapsed.Minutes:D2}";
            }
        });
    }

    private void OnPhaseChanged(FlightPhase oldPhase, FlightPhase newPhase)
    {
        App.Current.Dispatcher.Invoke(() =>
        {
            CurrentPhase = newPhase.ToString();
            AddActivity($"{oldPhase} → {newPhase}");
        });
    }

    private void OnExceedances(List<Exceedance> exceedances)
    {
        App.Current.Dispatcher.Invoke(() =>
        {
            foreach (var exc in exceedances)
            {
                ExceedanceLog.Add($"[{exc.Severity}] {exc.Description}");
            }
            ExceedanceCount = _flightManager.ExceedanceCount;
        });
    }

    private void OnScored(ScoringEngine.ScoreResult score)
    {
        App.Current.Dispatcher.Invoke(() =>
        {
            FinalScore = score.FinalScore;
            LandingGrade = score.LandingGrade.Grade.ToString();
            LandingDescription = score.LandingGrade.Description;
            XpEarned = score.XpEarned;
            FlightRejected = score.Rejected;
            RejectionReason = score.RejectionReason;
            ShowScoreCard = true;
            IsFlightActive = false;
        });
    }

    private void OnEvent(string msg)
    {
        App.Current.Dispatcher.Invoke(() => AddActivity(msg));
    }

    private void AddActivity(string msg)
    {
        ActivityLog.Insert(0, $"[{DateTime.Now:HH:mm:ss}] {msg}");
        if (ActivityLog.Count > 100) ActivityLog.RemoveAt(ActivityLog.Count - 1);
    }
}
