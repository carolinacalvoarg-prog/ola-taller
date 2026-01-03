import { colors } from '../styles/colors';

function Card({ children, title }) {
  return (
    <div style={{
      backgroundColor: colors.white,
      borderRadius: '8px',
      padding: '1.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '1.5rem'
    }}>
      {title && (
        <h3 style={{ 
          fontSize: '1.125rem', 
          fontWeight: '600', 
          marginBottom: '1rem',
          color: colors.gray[900]
        }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

export default Card;
