// src/shared/context/ModalProvider.jsx
import { useState, useEffect, useRef } from "react";
import { ModalContext } from "./ModalContext";
import { logger } from "@shared/utils/logger.js";

const fileName = "ModalProvider";
const log = logger.scope(fileName);

// Utilidades de logging
const maskPhone = (v) => {
    if (!v) return "";
    const s = String(v);
    if (s.length <= 2) return "*".repeat(s.length);
    return s.slice(0, -2).replace(/\d/g, "*") + s.slice(-2);
};

export const ModalProvider = ({ children }) => {
    // Estados básicos
    const [keypadOpen, setKeypadOpen] = useState(
        JSON.parse(localStorage.getItem("keypadOpen") || "false")
    );
    const [operation, setOperation] = useState(localStorage.getItem("operation") || null);

    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

    // Modales
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
        const before = {
            insertMoneyOpen,
            showLockerOpen,
            showErrorAPIOpen,
            registerUserPeriodOpen,
        };
        setInsertMoneyOpen(false);
        setShowLockerOpen(false);
        setShowErrorAPIOpen(false);
        setRegisterUserPeriodOpen(false);
        log.info("closeAllModals", before);
    };

    // Inputs KeyPad (NO logueamos password/confirmPassword/email)
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

    // Montaje / Desmontaje
    useEffect(() => {
        log.info("mounted");
        return () => log.info("unmounted");
    }, []);

    // Persistencia
    useEffect(() => localStorage.setItem("keypadOpen", JSON.stringify(keypadOpen)), [keypadOpen]);
    useEffect(() => {
        operation ? localStorage.setItem("operation", operation) : localStorage.removeItem("operation");
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

    // Logging de cambios clave (sin ruido)
    const prevAmountRef = useRef(String(amountPay) || "0");

    useEffect(() => {
        log.info("keypad", { open: keypadOpen });
    }, [keypadOpen]);

    useEffect(() => {
        if (operation) log.info("operation", { operation });
    }, [operation]);

    useEffect(() => {
        log.info("insertMoney", { open: insertMoneyOpen });
    }, [insertMoneyOpen]);

    useEffect(() => {
        log.info("showLocker", { open: showLockerOpen });
    }, [showLockerOpen]);

    useEffect(() => {
        log.info("showErrorAPI", { open: showErrorAPIOpen });
    }, [showErrorAPIOpen]);

    useEffect(() => {
        log.info("registerUserPeriod", { open: registerUserPeriodOpen });
    }, [registerUserPeriodOpen]);

    useEffect(() => {
        // Solo loguea teléfono enmascarado
        if (phone) log.info("phone.set", { phone: maskPhone(phone) });
    }, [phone]);

    useEffect(() => {
        // amountPay puede cambiar muy seguido. Solo se loguea:
        // - transición 0 -> >0 (inicio de entrada)
        // - transición >0 -> 0 (reinicio/limpieza)
        const prev = String(prevAmountRef.current);
        const cur = String(amountPay);
        const prevNum = Number(prev) || 0;
        const curNum = Number(cur) || 0;

        if (prevNum === 0 && curNum > 0) {
            log.info("amountPay.started", { amount: curNum });
        } else if (prevNum > 0 && curNum === 0) {
            log.info("amountPay.reset");
        }
        prevAmountRef.current = cur;
    }, [amountPay]);

    useEffect(() => {
        if (locker) log.info("locker.assigned", { locker });
    }, [locker]);

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
