// ==========================================
// 🆕 NUEVO ARCHIVO: hooks/useInviteModal.js
// ==========================================
// Hook con useReducer para gestionar el estado del modal de invitación
// Consolida múltiples useState en un solo reducer

import { useReducer } from 'react';

// Estado inicial del modal
const initialState = {
  showModal: false,
  email: '',
  role: 'organization_member_write',
  functionalRole: '',
  isLoading: false,
  error: null
};

// Tipos de acciones
const ACTIONS = {
  OPEN_MODAL: 'OPEN_MODAL',
  CLOSE_MODAL: 'CLOSE_MODAL',
  SET_EMAIL: 'SET_EMAIL',
  SET_ROLE: 'SET_ROLE',
  SET_FUNCTIONAL_ROLE: 'SET_FUNCTIONAL_ROLE',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  RESET_FORM: 'RESET_FORM'
};

// Reducer function
function inviteModalReducer(state, action) {
  switch (action.type) {
    case ACTIONS.OPEN_MODAL:
      return { ...state, showModal: true };
    
    case ACTIONS.CLOSE_MODAL:
      return { ...state, showModal: false };
    
    case ACTIONS.SET_EMAIL:
      return { ...state, email: action.payload };
    
    case ACTIONS.SET_ROLE:
      return { ...state, role: action.payload };
    
    case ACTIONS.SET_FUNCTIONAL_ROLE:
      return { ...state, functionalRole: action.payload };
    
    case ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };
    
    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload };
    
    case ACTIONS.RESET_FORM:
      return {
        ...initialState,
        showModal: state.showModal // Mantener el estado del modal
      };
    
    default:
      return state;
  }
}

/**
 * Hook personalizado para gestionar el estado del modal de invitación
 * Usa useReducer para consolidar múltiples useState
 * 
 * @returns {Object} { state, actions }
 */
const useInviteModal = () => {
  const [state, dispatch] = useReducer(inviteModalReducer, initialState);

  // Actions helpers
  const actions = {
    openModal: () => dispatch({ type: ACTIONS.OPEN_MODAL }),
    closeModal: () => dispatch({ type: ACTIONS.CLOSE_MODAL }),
    setEmail: (email) => dispatch({ type: ACTIONS.SET_EMAIL, payload: email }),
    setRole: (role) => dispatch({ type: ACTIONS.SET_ROLE, payload: role }),
    setFunctionalRole: (functionalRole) => dispatch({ type: ACTIONS.SET_FUNCTIONAL_ROLE, payload: functionalRole }),
    setLoading: (isLoading) => dispatch({ type: ACTIONS.SET_LOADING, payload: isLoading }),
    setError: (error) => dispatch({ type: ACTIONS.SET_ERROR, payload: error }),
    resetForm: () => dispatch({ type: ACTIONS.RESET_FORM })
  };

  return {
    state,
    actions
  };
};

export default useInviteModal;
export { ACTIONS };

