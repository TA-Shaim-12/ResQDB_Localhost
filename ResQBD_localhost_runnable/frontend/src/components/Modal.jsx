// frontend/src/components/Modal.jsx
import React, { createContext, useCallback, useContext, useState } from "react";

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [modal, setModal] = useState(null); // { title, body }

  const openModal = useCallback((title, body) => setModal({ title, body }), []);
  const closeModal = useCallback(() => setModal(null), []);

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      <div className={`modal-backdrop${modal ? " open" : ""}`} onClick={(e) => e.target === e.currentTarget && closeModal()}>
        {modal && (
          <div className="modal">
            <div className="modal-head">
              <div className="modal-title">{modal.title}</div>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">{modal.body}</div>
          </div>
        )}
      </div>
    </ModalContext.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used within a ModalProvider");
  return ctx;
}
