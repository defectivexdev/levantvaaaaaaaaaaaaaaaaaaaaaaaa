using System.Windows;

namespace LevantACARS.Views;

public partial class RepairSplash : Window
{
    public RepairSplash()
    {
        InitializeComponent();
    }

    public void UpdateStatus(string message)
    {
        Dispatcher.Invoke(() => StatusText.Text = message);
    }
}
