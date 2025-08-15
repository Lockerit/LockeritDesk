class CancelObservable extends EventTarget {
    setCancel(value) {
        localStorage.setItem('isCancelInsertMoney', value);
        this.dispatchEvent(new CustomEvent('cancel', { detail: value }));
    }
    onCancel(callback) {
        this.addEventListener('cancel', callback);
    }
    removeEventListener(type, callback) {
        super.removeEventListener(type, callback);
    }
}
export const cancelObservable = new CancelObservable();