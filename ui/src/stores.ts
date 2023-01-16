export interface Store {
	displayErrorAlert: (message: string) => void;
}

export const StoreKey = Symbol('store');
