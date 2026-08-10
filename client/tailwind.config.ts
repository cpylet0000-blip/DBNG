import type { Config } from 'tailwindcss'

const config: Config = {
  theme: {
    extend: {
      animation: {
        'ripple': 'ripple 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce-subtle 1s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'enter': 'enter 0.5s ease-out forwards',
        'shine': 'shine 2s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'pop': 'pop 0.3s ease-out',
      },
      keyframes: {
        ripple: {
          '0%, 100%': { 
            boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.3), 0 0 0 0 rgba(239, 68, 68, 0.2)' 
          },
          '50%': { 
            boxShadow: '0 0 0 10px rgba(239, 68, 68, 0), 0 0 0 20px rgba(239, 68, 68, 0)' 
          },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'enter': {
          '0%': { 
            opacity: '0',
            transform: 'scale(0.8) translateY(10px)'
          },
          '100%': { 
            opacity: '1',
            transform: 'scale(1) translateY(0)'
          },
        },
        'shine': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        glow: {
          '0%, 100%': { 
            boxShadow: '0 0 5px rgba(251, 191, 36, 0.3), 0 0 10px rgba(251, 191, 36, 0.2)'
          },
          '50%': { 
            boxShadow: '0 0 10px rgba(251, 191, 36, 0.5), 0 0 20px rgba(251, 191, 36, 0.3)'
          },
        },
        pop: {
          '0%': { transform: 'scale(0.95)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      transitionDuration: {
        '400': '400ms',
        '500': '500ms',
        '600': '600ms',
      },
      boxShadow: {
        'glow-red': '0 0 15px rgba(239, 68, 68, 0.5), 0 0 30px rgba(239, 68, 68, 0.3)',
        'glow-yellow': '0 0 10px rgba(251, 191, 36, 0.4), 0 0 20px rgba(251, 191, 36, 0.2)',
        'inner-xl': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)',
      },
      backgroundImage: {
        'radial-glow': 'radial-gradient(circle at center, rgba(239, 68, 68, 0.2) 0%, transparent 70%)',
      },
    },
  },
  plugins: [],
}

export default config
