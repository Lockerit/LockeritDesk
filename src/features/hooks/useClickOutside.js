import { useEffect } from "react";

export function useClickOutside(refs, callback) {
    useEffect(() => {
        const handleClick = (e) => {
            const isOutside = refs.every(ref => ref.current && !ref.current.contains(e.target));
            if (isOutside) callback();
        };

        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [refs, callback]);
}