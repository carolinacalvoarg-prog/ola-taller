using Microsoft.EntityFrameworkCore;
using OlaCore.Models;

namespace OlaInfrastructure.Data;

public class OlaDbContext : DbContext
{
    public OlaDbContext(DbContextOptions<OlaDbContext> options) : base(options)
    {
    }

    public DbSet<Alumno> Alumnos { get; set; }
    public DbSet<Profesor> Profesores { get; set; }
    public DbSet<Turno> Turnos { get; set; }
    public DbSet<Inscripcion> Inscripciones { get; set; }
    public DbSet<Asistencia> Asistencias { get; set; }
    public DbSet<Pago> Pagos { get; set; }
    public DbSet<Usuario> Usuarios { get; set; }
    public DbSet<ConfiguracionSistema> ConfiguracionesSistema { get; set; }
    public DbSet<Actividad> Actividades { get; set; }
    public DbSet<DiaSinClase> DiasSinClase { get; set; }
    public DbSet<AusenciaProgramada> AusenciasProgramadas { get; set; }
    public DbSet<RecuperacionProgramada> RecuperacionesProgramadas { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configuración de Alumno
        modelBuilder.Entity<Alumno>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Nombre).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Apellido).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(200);
            entity.HasIndex(e => e.Email).IsUnique();
        });

        // Configuración de Profesor
        modelBuilder.Entity<Profesor>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Nombre).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Apellido).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(200);
            entity.HasIndex(e => e.Email).IsUnique();
        });

        // Configuración de Turno
        modelBuilder.Entity<Turno>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Profesor)
                  .WithMany(p => p.Turnos)
                  .HasForeignKey(e => e.ProfesorId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // Configuración de Inscripcion
        modelBuilder.Entity<Inscripcion>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Alumno)
                  .WithMany(a => a.Inscripciones)
                  .HasForeignKey(e => e.AlumnoId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Turno)
                  .WithMany(t => t.Inscripciones)
                  .HasForeignKey(e => e.TurnoId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => new { e.AlumnoId, e.TurnoId });
        });

        // Configuración de Asistencia
        modelBuilder.Entity<Asistencia>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Alumno)
                  .WithMany(a => a.Asistencias)
                  .HasForeignKey(e => e.AlumnoId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Turno)
                  .WithMany(t => t.Asistencias)
                  .HasForeignKey(e => e.TurnoId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => new { e.AlumnoId, e.TurnoId, e.Fecha });
        });

        // Configuración de Pago
        modelBuilder.Entity<Pago>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Monto).HasPrecision(10, 2);
            entity.HasOne(e => e.Alumno)
                  .WithMany(a => a.Pagos)
                  .HasForeignKey(e => e.AlumnoId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => new { e.AlumnoId, e.MesPago, e.AnioPago });
        });

        // Configuración de Usuario
        modelBuilder.Entity<Usuario>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(200);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasOne(e => e.Alumno)
                  .WithMany()
                  .HasForeignKey(e => e.AlumnoId)
                  .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.Profesor)
                  .WithMany()
                  .HasForeignKey(e => e.ProfesorId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // Configuración de ConfiguracionSistema
        modelBuilder.Entity<ConfiguracionSistema>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Clave).IsRequired().HasMaxLength(100);
            entity.HasIndex(e => e.Clave).IsUnique();
            entity.Property(e => e.Valor).IsRequired().HasMaxLength(500);

            // Seed data con valor por defecto de horas de anticipacion
            entity.HasData(new ConfiguracionSistema
            {
                Id = 1,
                Clave = "HorasAnticipacionCancelacion",
                Valor = "24",
                Descripcion = "Horas de anticipacion minimas para cancelar una clase"
            });
        });

        // Configuracion de Actividad
        modelBuilder.Entity<Actividad>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Tipo).IsRequired().HasMaxLength(50);
            entity.HasOne(e => e.Alumno)
                  .WithMany()
                  .HasForeignKey(e => e.AlumnoId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Turno)
                  .WithMany()
                  .HasForeignKey(e => e.TurnoId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.Fecha);
        });

        modelBuilder.Entity<DiaSinClase>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Fecha).IsRequired();
            entity.Property(e => e.Motivo).HasMaxLength(200);
            entity.HasIndex(e => e.Fecha).IsUnique();
        });

        modelBuilder.Entity<AusenciaProgramada>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Inscripcion)
                  .WithMany(i => i.AusenciasProgramadas)
                  .HasForeignKey(e => e.InscripcionId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => new { e.InscripcionId, e.Fecha }).IsUnique();
        });

        modelBuilder.Entity<RecuperacionProgramada>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Alumno)
                  .WithMany()
                  .HasForeignKey(e => e.AlumnoId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Turno)
                  .WithMany()
                  .HasForeignKey(e => e.TurnoId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => new { e.AlumnoId, e.TurnoId, e.Fecha }).IsUnique();
        });
    }
}
