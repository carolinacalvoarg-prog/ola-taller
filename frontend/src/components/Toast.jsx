import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { colors } from '../styles/colors';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
};

const bgColors = {
  success: colors.success,
  error: colors.error,
  warning: colors.warning,
};

function Toast({ message, type = 'success', onClose, duration = 3000 }) {
  const Icon = icons[type];
  const bgColor = bgColors[type];

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <div style={{
      position: 'fixed',
      top: '1.5rem',
      right: '1.5rem',
      zIndex: 1000,
      animation: 'slideIn 0.3s ease-out',
    }}>
      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '1rem 1.25rem',
        backgroundColor: colors.white,
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        borderLeft: `4px solid ${bgColor}`,
        minWidth: '280px',
        maxWidth: '400px',
      }}>
        <Icon size={20} style={{ color: bgColor, flexShrink: 0 }} />
        <span style={{
          flex: 1,
          fontSize: '0.875rem',
          color: colors.gray[800],
          fontWeight: '500',
        }}>
          {message}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.gray[400],
            borderRadius: '4px',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.color = colors.gray[600]}
          onMouseLeave={(e) => e.target.style.color = colors.gray[400]}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export default Toast;
