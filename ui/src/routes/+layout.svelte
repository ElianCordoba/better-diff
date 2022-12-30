<script>
	import { SvelteUIProvider, Switch } from '@svelteuidev/core';

	let isDark = true;
	function toggleTheme() {
		isDark = !isDark;
	}
</script>

<SvelteUIProvider ssr withGlobalStyles themeObserver={isDark ? 'dark' : 'light'}>
	<Switch on:change={toggleTheme} />
	<slot />
</SvelteUIProvider>
