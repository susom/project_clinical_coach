import React, { createContext, useContext, useState } from 'react';
import './ConfirmModal.css';

const ConfirmModalContext = createContext();

export const useConfirmModal = () => useContext(ConfirmModalContext);

export const ConfirmModalProvider = ({ children }) => {
    const [modalConfig, setModalConfig] = useState(null);

    const showConfirmModal = (config) => {
        return new Promise((resolve) => {
            setModalConfig({ ...config, resolve });
        });
    };

    const hideModal = () => setModalConfig(null);

    const handleConfirm = () => {
        modalConfig.resolve(true);
        hideModal();
    };

    const handleCancel = () => {
        modalConfig.resolve(false);
        hideModal();
    };

    return (
        <ConfirmModalContext.Provider value={{ showConfirmModal }}>
            {children}
            {modalConfig && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        {modalConfig.title && <h3 className="modal-title">{modalConfig.title}</h3>}
                        {modalConfig.message && (
                            <div
                                className="modal-message"
                                dangerouslySetInnerHTML={{ __html: modalConfig.message }}
                            ></div>
                        )}
                        <div className="modal-buttons">
                            {modalConfig.showConfirm && (
                                <button className="modal-button confirm" onClick={handleConfirm}>
                                    {modalConfig.confirmText || 'Yes'}
                                </button>
                            )}
                            {modalConfig.showCancel && (
                                <button className="modal-button cancel" onClick={handleCancel}>
                                    {modalConfig.cancelText || 'No'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </ConfirmModalContext.Provider>
    );
};
