using System.IO;
using System.Net.Http;
using System.Security.Cryptography;
using Serilog;

namespace LevantACARS.Services;

/// <summary>
/// Production-grade dependency guard with SHA-256 hash validation.
/// Verifies and auto-downloads missing or corrupted native DLLs on startup.
/// </summary>
public static class DependencyGuard
{
    private static readonly string BaseDir = AppContext.BaseDirectory;
    private static readonly string FallbackDir = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "LevantACARS", "deps");

    /// <summary>
    /// Native dependency manifest: filename → (download URL, expected SHA-256 hex or null to skip hash check).
    /// Hash set to null = download if missing but skip integrity check (useful until hashes are pinned).
    /// </summary>
    private static readonly Dictionary<string, (string Url, string? Sha256)> Manifest = new()
    {
        // Discord RPC native binary
        ["discord-rpc.dll"] = (
            "https://levant-va.com/deps/discord-rpc.dll",
            null // Pin SHA-256 hash here once the CDN file is stable
        ),
    };

    /// <summary>Result of the dependency check.</summary>
    public sealed record GuardResult(
        bool AllPresent,
        List<string> Repaired,
        List<string> Failed,
        bool DiscordAvailable);

    /// <summary>
    /// Verify all native dependencies. Downloads missing/corrupt files.
    /// Call this BEFORE initializing any services that depend on native DLLs.
    /// </summary>
    public static async Task<GuardResult> VerifyDependenciesAsync(
        Action<string>? onStatus = null)
    {
        var repaired = new List<string>();
        var failed = new List<string>();

        // Ensure fallback directory exists
        if (!Directory.Exists(FallbackDir))
            Directory.CreateDirectory(FallbackDir);

        foreach (var (fileName, (url, expectedHash)) in Manifest)
        {
            var primaryPath = Path.Combine(BaseDir, fileName);
            var fallbackPath = Path.Combine(FallbackDir, fileName);

            // Check primary location first, then fallback
            var existsAtPrimary = File.Exists(primaryPath);
            var existsAtFallback = File.Exists(fallbackPath);
            var existingPath = existsAtPrimary ? primaryPath : (existsAtFallback ? fallbackPath : null);

            bool needsDownload = false;

            if (existingPath == null)
            {
                needsDownload = true;
                Log.Information("[DependencyGuard] Missing: {File}", fileName);
            }
            else if (expectedHash != null)
            {
                // Hash validation
                var actualHash = await ComputeSha256Async(existingPath);
                if (!string.Equals(actualHash, expectedHash, StringComparison.OrdinalIgnoreCase))
                {
                    needsDownload = true;
                    Log.Warning("[DependencyGuard] Hash mismatch for {File} (expected: {Expected}, got: {Actual})",
                        fileName, expectedHash[..12] + "...", actualHash[..12] + "...");
                }
            }

            if (!needsDownload) continue;

            onStatus?.Invoke($"Downloading {fileName}...");
            Log.Information("[DependencyGuard] Downloading {File} from {Url}", fileName, url);

            try
            {
                using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
                var data = await http.GetByteArrayAsync(url);

                // Validate downloaded hash if expected hash is set
                if (expectedHash != null)
                {
                    var downloadedHash = ComputeSha256(data);
                    if (!string.Equals(downloadedHash, expectedHash, StringComparison.OrdinalIgnoreCase))
                    {
                        Log.Error("[DependencyGuard] Downloaded {File} hash mismatch — file may be corrupt", fileName);
                        failed.Add(fileName);
                        continue;
                    }
                }

                // Try writing to primary location first
                var targetPath = primaryPath;
                try
                {
                    await File.WriteAllBytesAsync(targetPath, data);
                }
                catch (UnauthorizedAccessException)
                {
                    // Fallback to AppData if primary is read-only (e.g. Program Files)
                    targetPath = fallbackPath;
                    await File.WriteAllBytesAsync(targetPath, data);
                    Log.Warning("[DependencyGuard] Wrote {File} to fallback: {Path}", fileName, FallbackDir);
                }

                repaired.Add(fileName);
                Log.Information("[DependencyGuard] Repaired: {File} → {Path}", fileName, targetPath);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "[DependencyGuard] Failed to download {File}", fileName);
                failed.Add(fileName);

                // Write crash log
                try
                {
                    var crashLog = Path.Combine(BaseDir, "crashlog.txt");
                    var entry = $"[{DateTime.UtcNow:O}] Failed to download {fileName}: {ex.Message}\n";
                    await File.AppendAllTextAsync(crashLog, entry);
                }
                catch { /* best effort */ }
            }
        }

        // Check if Discord native DLL is available in either location
        var discordAvailable = File.Exists(Path.Combine(BaseDir, "discord-rpc.dll"))
                            || File.Exists(Path.Combine(FallbackDir, "discord-rpc.dll"));

        // If using fallback dir, tell the runtime where to find DLLs
        if (Directory.Exists(FallbackDir) && Directory.GetFiles(FallbackDir).Length > 0)
        {
            Environment.SetEnvironmentVariable("PATH",
                FallbackDir + ";" + Environment.GetEnvironmentVariable("PATH"));
        }

        var result = new GuardResult(
            AllPresent: failed.Count == 0,
            Repaired: repaired,
            Failed: failed,
            DiscordAvailable: discordAvailable);

        if (repaired.Count > 0)
            Log.Information("[DependencyGuard] Repaired {Count} file(s): {Files}", repaired.Count, string.Join(", ", repaired));
        if (failed.Count > 0)
            Log.Warning("[DependencyGuard] {Count} file(s) could not be repaired: {Files}", failed.Count, string.Join(", ", failed));

        return result;
    }

    private static async Task<string> ComputeSha256Async(string filePath)
    {
        using var sha = SHA256.Create();
        await using var stream = File.OpenRead(filePath);
        var hash = await sha.ComputeHashAsync(stream);
        return Convert.ToHexString(hash);
    }

    private static string ComputeSha256(byte[] data)
    {
        var hash = SHA256.HashData(data);
        return Convert.ToHexString(hash);
    }
}
