// context/modalContext.jsx
import { createContext, useContext, useState, useEffect } from "react";

const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
    // Estados básicos
    const [modalOpen, setModalOpen] = useState(
        JSON.parse(localStorage.getItem("modalOpen") || "false")
    );
    const [operation, setOperation] = useState(localStorage.getItem("operation") || null);

    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

    // 🔹 Ahora inicializamos insertMoneyOpen y assignLockerOpen desde localStorage
    const [insertMoneyOpen, setInsertMoneyOpen] = useState(
        JSON.parse(localStorage.getItem("insertMoneyOpen") || "false")
    );
    const [assignLockerOpen, setAssignLockerOpen] = useState(
        JSON.parse(localStorage.getItem("assignLockerOpen") || "false")
    );

    const [showErrorAPIOpen, setShowErrorAPIOpen] = useState(
        JSON.parse(localStorage.getItem("showErrorAPIOpen") || "false")
    );

    const closeAllModals = () => {
        setModalOpen(false);
        setInsertMoneyOpen(false);
        setAssignLockerOpen(false);
        setShowErrorAPIOpen(false);
    };

    // Inputs KeyPad
    const [phone, setPhone] = useState(localStorage.getItem("modalPhone") || "");
    const [password, setPassword] = useState(localStorage.getItem("modalPassword") || "");
    const [confirmPassword, setConfirmPassword] = useState(localStorage.getItem("modalConfirmPassword") || "");

    // Extra data
    const [amountPay, setAmountPay] = useState(localStorage.getItem("modalAmountPay") || "0");
    const [locker, setLocker] = useState(localStorage.getItem("modalLocker") || "");



    // Persistencia automática
    useEffect(() => localStorage.setItem("modalOpen", JSON.stringify(modalOpen)), [modalOpen]);
    useEffect(() => {
        operation
            ? localStorage.setItem("operation", operation)
            : localStorage.removeItem("operation");
    }, [operation]);

    useEffect(() => localStorage.setItem("insertMoneyOpen", JSON.stringify(insertMoneyOpen)), [insertMoneyOpen]);
    useEffect(() => localStorage.setItem("assignLockerOpen", JSON.stringify(assignLockerOpen)), [assignLockerOpen]);

    useEffect(() => localStorage.setItem("modalPhone", phone), [phone]);
    useEffect(() => localStorage.setItem("modalPassword", password), [password]);
    useEffect(() => localStorage.setItem("modalConfirmPassword", confirmPassword), [confirmPassword]);

    useEffect(() => localStorage.setItem("modalAmountPay", amountPay), [amountPay]);
    useEffect(() => localStorage.setItem("modalLocker", locker), [locker]);

    return (
        <ModalContext.Provider
            value={{
                modalOpen, setModalOpen,
                operation, setOperation,
                confirmDialogOpen, setConfirmDialogOpen,
                insertMoneyOpen, setInsertMoneyOpen,
                assignLockerOpen, setAssignLockerOpen,
                showErrorAPIOpen, setShowErrorAPIOpen,
                phone, setPhone,
                password, setPassword,
                confirmPassword, setConfirmPassword,
                amountPay, setAmountPay,
                locker, setLocker,
                closeAllModals,
            }}
        >
            {children}
        </ModalContext.Provider>
    );
};

export const useModal = () => useContext(ModalContext);
