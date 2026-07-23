using Microsoft.EntityFrameworkCore;
using OlaInfrastructure.Data;
using OlaAPI.Controllers;
using OlaCore.Models;

var builder = WebApplication.CreateBuilder(args);

// Configuración de la base de datos: siempre PostgreSQL.
// Prioridad: 1) DATABASE_URL (env, deploy), 2) PostgresConnection (appsettings.Development.json, local)
static string ToNpgsqlConnectionString(string value)
{
    if (!value.StartsWith("postgres://") && !value.StartsWith("postgresql://"))
        return value;
    var uri = new Uri(value);
    var userInfo = uri.UserInfo.Split(':');
    return $"Host={uri.Host};Port={uri.Port};Database={uri.AbsolutePath.TrimStart('/')};Username={Uri.UnescapeDataString(userInfo[0])};Password={Uri.UnescapeDataString(userInfo[1])};SSL Mode=Require;Trust Server Certificate=true";
}

var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
var postgresConnString = builder.Configuration.GetConnectionString("PostgresConnection");

if (!string.IsNullOrEmpty(databaseUrl))
{
    builder.Services.AddDbContext<OlaDbContext>(options =>
        options.UseNpgsql(ToNpgsqlConnectionString(databaseUrl)));
    Console.WriteLine("Using PostgreSQL database (DATABASE_URL)");
}
else if (!string.IsNullOrEmpty(postgresConnString))
{
    builder.Services.AddDbContext<OlaDbContext>(options =>
        options.UseNpgsql(ToNpgsqlConnectionString(postgresConnString)));
    Console.WriteLine("Using PostgreSQL database (appsettings)");
}
else
{
    throw new InvalidOperationException(
        "No hay conexión a la base de datos configurada. Definí DATABASE_URL (deploy) " +
        "o ConnectionStrings:PostgresConnection en appsettings.Development.json (local).");
}

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configuración de CORS
var allowedOriginsEnv = Environment.GetEnvironmentVariable("ALLOWED_ORIGINS");
Console.WriteLine($"ALLOWED_ORIGINS env: {allowedOriginsEnv ?? "(not set)"}");

var allowedOrigins = allowedOriginsEnv?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    ?? new[] { "http://localhost:5173", "http://localhost:3000" };

Console.WriteLine($"Allowed origins: {string.Join(", ", allowedOrigins)}");

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});

var app = builder.Build();

// Aplicar migraciones automáticamente (desarrollo y producción)
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<OlaDbContext>();
    context.Database.Migrate();
    Console.WriteLine("Database migrations applied");
}

// Configure the HTTP request pipeline.
// Swagger habilitado en todos los entornos para facilitar testing
app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("AllowFrontend");
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

// Seed users
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<OlaDbContext>();
    var defaultPasswordHash = AuthController.GetDefaultPasswordHash();

    // Crear admin si no existe
    if (!context.Usuarios.Any(u => u.Rol == "Admin"))
    {
        var adminUser = new Usuario
        {
            Email = "admin@olataller.com",
            PasswordHash = defaultPasswordHash,
            Rol = "Admin",
            Activo = true
        };
        context.Usuarios.Add(adminUser);
        context.SaveChanges();
        Console.WriteLine("Admin user created: admin@olataller.com");
    }

    // Crear usuarios para alumnos existentes que no tengan usuario
    var alumnosSinUsuario = context.Alumnos
        .Where(a => a.Activo && !context.Usuarios.Any(u => u.AlumnoId == a.Id))
        .ToList();

    foreach (var alumno in alumnosSinUsuario)
    {
        var usuario = new Usuario
        {
            Email = alumno.Email,
            PasswordHash = defaultPasswordHash,
            Rol = "Alumno",
            AlumnoId = alumno.Id,
            Activo = true
        };
        context.Usuarios.Add(usuario);
    }
    if (alumnosSinUsuario.Any())
    {
        context.SaveChanges();
        Console.WriteLine($"Created {alumnosSinUsuario.Count} user(s) for existing alumnos");
    }

    // Crear usuarios para profesores existentes que no tengan usuario
    var profesoresSinUsuario = context.Profesores
        .Where(p => p.Activo && !context.Usuarios.Any(u => u.ProfesorId == p.Id))
        .ToList();

    foreach (var profesor in profesoresSinUsuario)
    {
        var usuario = new Usuario
        {
            Email = profesor.Email,
            PasswordHash = defaultPasswordHash,
            Rol = "Profesor",
            ProfesorId = profesor.Id,
            Activo = true
        };
        context.Usuarios.Add(usuario);
    }
    if (profesoresSinUsuario.Any())
    {
        context.SaveChanges();
        Console.WriteLine($"Created {profesoresSinUsuario.Count} user(s) for existing profesores");
    }
}

app.Run();
