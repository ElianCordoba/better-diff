<script lang="ts">
	import { SvelteUIProvider, Switch, Alert } from '@svelteuidev/core';
	import { setContext } from 'svelte';
	import { StoreKey, type Store } from '../stores';

	let isDark = true;
	function toggleTheme() {
		isDark = !isDark;
	}

	let _displayErrorAlert = false;
	let errorMessage = '';
	function displayErrorAlert(message: string) {
		_displayErrorAlert = true;
		errorMessage = message;
		setTimeout(() => {
			_displayErrorAlert = false;
			errorMessage = '';
		}, 3000);
	}

	setContext<Store>(StoreKey, {
		displayErrorAlert
	});
</script>

<SvelteUIProvider ssr withGlobalStyles themeObserver={isDark ? 'dark' : 'light'}>
	<!-- <Switch on:change={toggleTheme} /> -->
	<slot />
	{#if _displayErrorAlert}
		<Alert title="Server error" color="red" radius="md" withCloseButton>
			{errorMessage}
		</Alert>
	{/if}
</SvelteUIProvider>
