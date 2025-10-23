// context/modalContext.jsx
import { createContext, useContext, useState, useEffect } from "react";

const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
    // Estados básicos
    const [keypadOpen, setKeypadOpen] = useState(
        JSON.parse(localStorage.getItem("keypadOpen") || "false")
    );
    const [operation, setOperation] = useState(localStorage.getItem("operation") || null);

    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

    // 🔹 Ahora inicializamos insertMoneyOpen y showLockerOpen desde localStorage
    const [insertMoneyOpen, setInsertMoneyOpen] = useState(
        JSON.parse(localStorage.getItem("insertMoneyOpen") || "false")
    );
    const [showLockerOpen, setShowLockerOpen] = useState(
        JSON.parse(localStorage.getItem("showLockerOpen") || "false")
    );

    const [showErrorAPIOpen, setShowErrorAPIOpen] = useState(
        JSON.parse(localStorage.getItem("showErrorAPIOpen") || "false")
    );

    const [registerUserPeriodOpen, setRegisterUserPeriodOpen] = useState(
        JSON.parse(localStorage.getItem("registerUserPeriodOpen") || "false")
    );

    const closeAllModals = () => {
        setInsertMoneyOpen(false);
        setShowLockerOpen(false);
        setShowErrorAPIOpen(false);
        setRegisterUserPeriodOpen(false);
    };

    // Inputs KeyPad
    const [phone, setPhone] = useState(localStorage.getItem("modalPhone") || "");
    const [password, setPassword] = useState(localStorage.getItem("modalPassword") || "");
    const [confirmPassword, setConfirmPassword] = useState(localStorage.getItem("modalConfirmPassword") || "");
    const [nameUser, setNameUser] = useState(localStorage.getItem("modalnameUser") || "");
    const [period, setPeriod] = useState(localStorage.getItem("modalPeriod") || "Mensual");
    const [idNumber, setIdNumber] = useState(localStorage.getItem("modalIdNumber") || "");
    const [email, setEmail] = useState(localStorage.getItem("modalEmail") || "");

    // Extra data
    const [amountPay, setAmountPay] = useState(localStorage.getItem("modalAmountPay") || "0");
    const [locker, setLocker] = useState(localStorage.getItem("modalLocker") || "");

    // Persistencia automática
    useEffect(() => localStorage.setItem("keypadOpen", JSON.stringify(keypadOpen)), [keypadOpen]);
    useEffect(() => {
        operation
            ? localStorage.setItem("operation", operation)
            : localStorage.removeItem("operation");
    }, [operation]);

    useEffect(() => localStorage.setItem("insertMoneyOpen", JSON.stringify(insertMoneyOpen)), [insertMoneyOpen]);
    useEffect(() => localStorage.setItem("showLockerOpen", JSON.stringify(showLockerOpen)), [showLockerOpen]);
    useEffect(() => localStorage.setItem("registerUserPeriodOpen", JSON.stringify(registerUserPeriodOpen)), [registerUserPeriodOpen]);

    useEffect(() => localStorage.setItem("modalPhone", phone), [phone]);
    useEffect(() => localStorage.setItem("modalPassword", password), [password]);
    useEffect(() => localStorage.setItem("modalConfirmPassword", confirmPassword), [confirmPassword]);

    useEffect(() => localStorage.setItem("modalAmountPay", amountPay), [amountPay]);
    useEffect(() => localStorage.setItem("modalLocker", locker), [locker]);

    useEffect(() => localStorage.setItem("modalnameUser", nameUser), [nameUser]);
    useEffect(() => localStorage.setItem("modalPeriod", period), [period]);
    useEffect(() => localStorage.setItem("modalIdNumber", idNumber), [idNumber]);
    useEffect(() => localStorage.setItem("modalEmail", email), [email]);


    return (
        <ModalContext.Provider
            value={{
                keypadOpen, setKeypadOpen,
                operation, setOperation,
                confirmDialogOpen, setConfirmDialogOpen,
                insertMoneyOpen, setInsertMoneyOpen,
                showLockerOpen, setShowLockerOpen,
                showErrorAPIOpen, setShowErrorAPIOpen,
                registerUserPeriodOpen, setRegisterUserPeriodOpen,
                phone, setPhone,
                password, setPassword,
                confirmPassword, setConfirmPassword,
                amountPay, setAmountPay,
                locker, setLocker,
                nameUser, setNameUser,
                period, setPeriod,
                idNumber, setIdNumber,
                email, setEmail,
                closeAllModals,
            }}
        >
            {children}
        </ModalContext.Provider>
    );
};

export const useModal = () => useContext(ModalContext);
