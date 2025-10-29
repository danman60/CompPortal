// Shared dark theme for all email templates
// Matches app design: slate-900/800 backgrounds with purple/pink gradients

export const emailTheme = {
  // Backgrounds
  main: {
    backgroundColor: '#0f172a', // slate-900
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
    padding: '20px 0',
  },

  container: {
    backgroundColor: '#1e293b', // slate-800
    margin: '0 auto',
    padding: '20px 0 48px',
    marginBottom: '64px',
    maxWidth: '600px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },

  // Typography
  h1: {
    color: '#f1f5f9', // slate-100
    fontSize: '32px',
    fontWeight: 'bold',
    margin: '40px 0',
    padding: '0 40px',
    textAlign: 'center' as const,
  },

  h2: {
    color: '#f1f5f9', // slate-100
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '32px 40px 16px',
  },

  text: {
    color: '#e2e8f0', // slate-200
    fontSize: '16px',
    lineHeight: '26px',
    padding: '0 40px',
    margin: '12px 0',
  },

  textSmall: {
    color: '#cbd5e1', // slate-300
    fontSize: '14px',
    lineHeight: '22px',
    padding: '0 40px',
    margin: '8px 0',
  },

  // Components
  button: {
    borderRadius: '8px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '14px 48px',
    border: 'none',
  },

  hr: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
    margin: '32px 40px',
  },

  footer: {
    color: '#94a3b8', // slate-400
    fontSize: '14px',
    lineHeight: '24px',
    padding: '0 40px',
    textAlign: 'center' as const,
  },

  // Info boxes
  infoBox: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)', // purple with transparency
    borderRadius: '12px',
    padding: '24px 30px',
    margin: '24px 40px',
  },

  successBox: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)', // green with transparency
    borderRadius: '12px',
    padding: '24px 30px',
    margin: '24px 40px',
    borderLeft: '4px solid #22c55e',
  },

  warningBox: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)', // yellow with transparency
    borderRadius: '12px',
    padding: '24px 30px',
    margin: '24px 40px',
    borderLeft: '4px solid #fbbf24',
  },

  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)', // red with transparency
    borderRadius: '12px',
    padding: '24px 30px',
    margin: '24px 40px',
    borderLeft: '4px solid #ef4444',
  },

  // Labels and values
  label: {
    color: '#c4b5fd', // purple-300
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    margin: '0 0 8px 0',
  },

  value: {
    color: '#f1f5f9', // slate-100
    fontSize: '18px',
    fontWeight: '600',
    margin: '0',
  },

  valueLarge: {
    color: '#f1f5f9', // slate-100
    fontSize: '48px',
    fontWeight: 'bold',
    margin: '0',
    lineHeight: '1',
  },

  // Tables
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    margin: '20px 40px',
  },

  tableHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#c4b5fd', // purple-300
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    padding: '12px 16px',
    textAlign: 'left' as const,
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },

  tableCell: {
    color: '#e2e8f0', // slate-200
    fontSize: '14px',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
};

// Helper to create gradient button
export const gradientButton = (primaryColor: string, secondaryColor: string) => ({
  ...emailTheme.button,
  background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
});

// Default brand colors
export const defaultBranding = {
  primaryColor: '#8b5cf6', // purple-500
  secondaryColor: '#ec4899', // pink-500
};
