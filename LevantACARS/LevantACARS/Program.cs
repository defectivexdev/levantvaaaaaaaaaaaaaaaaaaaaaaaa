using System.IO;
using System.Windows;
using Velopack;

namespace LevantACARS;

public static class Program
{
    [STAThread]
    public static void Main(string[] args)
    {
        // Velopack installer/updater hooks — must run before anything else
        VelopackApp.Build().Run();

        // Fix base directory for single-file publish (extracts to temp folder)
        var exePath = AppContext.BaseDirectory;
        if (!string.IsNullOrEmpty(exePath))
            Directory.SetCurrentDirectory(exePath);

        try
        {
            var app = new App();
            app.DispatcherUnhandledException += (_, e) =>
            {
                MessageBox.Show(
                    $"Unhandled error:\n\n{e.Exception.Message}\n\n{e.Exception.StackTrace}",
                    "LevantACARS Error", MessageBoxButton.OK, MessageBoxImage.Error);
                e.Handled = true;
            };
            app.Run();
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                $"Fatal startup error:\n\n{ex.Message}\n\n{ex.StackTrace}",
                "LevantACARS Fatal Error", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }
}
