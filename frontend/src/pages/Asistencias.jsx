function Asistencias() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Asistencias</h2>
      </div>

      <div className="bg-white rounded-lg shadow p-8 text-center">
        <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Módulo de Asistencias
        </h3>
        <p className="text-gray-600 mb-6">
          Esta funcionalidad estará disponible próximamente. Aquí podrás registrar y consultar la asistencia de los alumnos a cada clase.
        </p>
        <div className="text-sm text-gray-500">
          Características planeadas:
          <ul className="mt-2 space-y-1 text-left max-w-md mx-auto">
            <li>• Marcar asistencia por turno y fecha</li>
            <li>• Ver historial de asistencias por alumno</li>
            <li>• Generar reportes de asistencia</li>
            <li>• Agregar observaciones por clase</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Asistencias;
