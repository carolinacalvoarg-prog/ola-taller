namespace OlaAPI.Helpers;

/// <summary>
/// Helper centralizado para manejar timezone Argentina (UTC-3).
/// Usar en vez de DateTime.UtcNow cuando se necesita la fecha/hora local de Argentina.
/// </summary>
public static class TimeHelper
{
    private static readonly TimeZoneInfo ArgentinaZone =
        TimeZoneInfo.FindSystemTimeZoneById("America/Buenos_Aires");

    /// <summary>Hora actual en Argentina.</summary>
    public static DateTime AhoraArgentina() =>
        TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, ArgentinaZone);

    /// <summary>Fecha de hoy en Argentina (midnight UTC, para comparar con fechas en la DB).</summary>
    public static DateTime HoyArgentina() =>
        DateTime.SpecifyKind(AhoraArgentina().Date, DateTimeKind.Utc);
}
