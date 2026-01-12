using Microsoft.EntityFrameworkCore;
using OlaInfrastructure.Data;
using OlaAPI.Controllers;
using OlaCore.Models;

var builder = WebApplication.CreateBuilder(args);

// Configuración de la base de datos
var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");

if (!string.IsNullOrEmpty(databaseUrl))
{
    // Producción: PostgreSQL (Supabase/Render)
    // Convertir formato postgres:// o postgresql:// a formato Npgsql
    var connStr = databaseUrl;
    if (databaseUrl.StartsWith("postgres://") || databaseUrl.StartsWith("postgresql://"))
    {
        var uri = new Uri(databaseUrl);
        var userInfo = uri.UserInfo.Split(':');
        connStr = $"Host={uri.Host};Port={uri.Port};Database={uri.AbsolutePath.TrimStart('/')};Username={userInfo[0]};Password={userInfo[1]};SSL Mode=Require;Trust Server Certificate=true";
    }

    builder.Services.AddDbContext<OlaDbContext>(options =>
        options.UseNpgsql(connStr));
    Console.WriteLine("Using PostgreSQL database");
}
else
{
    // Desarrollo: SQLite
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    builder.Services.AddDbContext<OlaDbContext>(options =>
        options.UseSqlite(connectionString));
    Console.WriteLine("Using SQLite database");
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

// Aplicar migraciones automáticamente en producción
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<OlaDbContext>();
    if (!string.IsNullOrEmpty(databaseUrl))
    {
        // En producción, aplicar migraciones
        context.Database.Migrate();
        Console.WriteLine("Database migrations applied");
    }
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
