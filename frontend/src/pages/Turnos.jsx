import { useState, useEffect } from 'react';
import { turnosService } from '../services/api';

const diasSemana = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

function Turnos() {
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    diaSemana: 1,
    horaInicio: '09:00',
    horaFin: '11:00',
    cuposMaximos: 8,
  });

  useEffect(() => {
    fetchTurnos();
  }, []);

  const fetchTurnos = async () => {
    try {
      setLoading(true);
      const response = await turnosService.getAll();
      setTurnos(response.data);
    } catch (error) {
      console.error('Error al cargar turnos:', error);
      alert('Error al cargar la lista de turnos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const turnoData = {
        ...formData,
        diaSemana: parseInt(formData.diaSemana),
        cuposMaximos: parseInt(formData.cuposMaximos),
      };
      await turnosService.create(turnoData);
      alert('Turno creado exitosamente');
      setShowForm(false);
      setFormData({
        diaSemana: 1,
        horaInicio: '09:00',
        horaFin: '11:00',
        cuposMaximos: 8,
      });
      fetchTurnos();
    } catch (error) {
      console.error('Error al crear turno:', error);
      alert('Error al crear el turno');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este turno?')) {
      try {
        await turnosService.delete(id);
        alert('Turno eliminado exitosamente');
        fetchTurnos();
      } catch (error) {
        console.error('Error al eliminar turno:', error);
        alert('Error al eliminar el turno');
      }
    }
  };

  const getDiaSemanaLabel = (dia) => {
    const diaObj = diasSemana.find(d => d.value === dia);
    return diaObj ? diaObj.label : '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Turnos</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
        >
          {showForm ? 'Cancelar' : '+ Nuevo Turno'}
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Nuevo Turno</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Día de la Semana *
                </label>
                <select
                  required
                  value={formData.diaSemana}
                  onChange={(e) => setFormData({ ...formData, diaSemana: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {diasSemana.map((dia) => (
                    <option key={dia.value} value={dia.value}>
                      {dia.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cupos Máximos *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="20"
                  value={formData.cuposMaximos}
                  onChange={(e) => setFormData({ ...formData, cuposMaximos: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hora Inicio *
                </label>
                <input
                  type="time"
                  required
                  value={formData.horaInicio}
                  onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hora Fin *
                </label>
                <input
                  type="time"
                  required
                  value={formData.horaFin}
                  onChange={(e) => setFormData({ ...formData, horaFin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors"
              >
                Guardar Turno
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Turnos */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {turnos.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay turnos</h3>
            <p className="mt-1 text-sm text-gray-500">Comienza agregando un nuevo turno.</p>
          </div>
        ) : (
          turnos.map((turno) => (
            <div key={turno.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {getDiaSemanaLabel(turno.diaSemana)}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {turno.horaInicio} - {turno.horaFin}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(turno.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Cupos:</span>
                  <span className="font-medium">
                    {turno.cuposOcupados || 0} / {turno.cuposMaximos}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-orange-600 h-2 rounded-full"
                    style={{
                      width: `${((turno.cuposOcupados || 0) / turno.cuposMaximos) * 100}%`
                    }}
                  />
                </div>
                <div className="text-sm text-gray-600">
                  {turno.cuposDisponibles || turno.cuposMaximos} cupos disponibles
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Turnos;
