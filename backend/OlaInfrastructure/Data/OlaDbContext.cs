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
    public DbSet<Taller> Talleres { get; set; }
    public DbSet<TurnoFecha> TurnoFechas { get; set; }
    public DbSet<TallerRecuperacionPermitida> TalleresRecuperacionPermitida { get; set; }
    public DbSet<TarifaMensual> TarifasMensuales { get; set; }

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

        // Configuración de Taller
        modelBuilder.Entity<Taller>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Nombre).IsRequired().HasMaxLength(150);
        });

        // Configuración de TallerRecuperacionPermitida
        modelBuilder.Entity<TallerRecuperacionPermitida>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Taller)
                  .WithMany(t => t.RecuperacionesPermitidas)
                  .HasForeignKey(e => e.TallerId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.TallerPermitido)
                  .WithMany()
                  .HasForeignKey(e => e.TallerPermitidoId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => new { e.TallerId, e.TallerPermitidoId }).IsUnique();
        });

        // Configuración de Turno
        modelBuilder.Entity<Turno>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Profesor)
                  .WithMany(p => p.Turnos)
                  .HasForeignKey(e => e.ProfesorId)
                  .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.Taller)
                  .WithMany(t => t.Turnos)
                  .HasForeignKey(e => e.TallerId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // Configuración de TurnoFecha
        modelBuilder.Entity<TurnoFecha>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Turno)
                  .WithMany(t => t.FechasManuales)
                  .HasForeignKey(e => e.TurnoId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => new { e.TurnoId, e.Fecha }).IsUnique();
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
            entity.Property(e => e.MontoEsperadoTransferencia).HasPrecision(10, 2);
            entity.Property(e => e.MontoEsperadoEfectivo).HasPrecision(10, 2);
            entity.Property(e => e.MontoAbonado).HasPrecision(10, 2);
        });

        // Configuración de TarifaMensual
        modelBuilder.Entity<TarifaMensual>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ValorClaseTransferencia).HasPrecision(10, 2);
            entity.Property(e => e.ValorClaseEfectivo).HasPrecision(10, 2);
            entity.HasOne(e => e.Taller)
                  .WithMany()
                  .HasForeignKey(e => e.TallerId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => new { e.Anio, e.Mes, e.TallerId }).IsUnique();
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
            },
            new ConfiguracionSistema { Id = 2, Clave = "TransferenciaTitular", Valor = "Yesica Anabela Cruz", Descripcion = "Titular de la cuenta para transferencias" },
            new ConfiguracionSistema { Id = 3, Clave = "TransferenciaCVU", Valor = "0000003100094666029136", Descripcion = "CVU para transferencias" },
            new ConfiguracionSistema { Id = 4, Clave = "TransferenciaAlias", Valor = "ola.ceramica", Descripcion = "Alias para transferencias" },
            new ConfiguracionSistema { Id = 5, Clave = "TransferenciaCUIT", Valor = "27319388309", Descripcion = "CUIT/CUIL del titular" },
            new ConfiguracionSistema { Id = 6, Clave = "TransferenciaBanco", Valor = "Mercado Pago", Descripcion = "Banco o billetera de destino" });
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
