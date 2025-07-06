<script setup lang="ts">
import api, { RequestError } from '@/api';
import { login } from '@/auth';
import { translateAPIError } from '@/lang';
import { useUserStore } from '@/stores/user';
import { computed, ref, toRefs, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

type Credentials = {
	email: string;
	password: string;
	otp?: string;
};

const props = defineProps<{
	provider: string;
}>();

const { t } = useI18n();

const router = useRouter();

const { provider } = toRefs(props);
const loggingIn = ref(false);
const email = ref<string | null>(null);
const password = ref<string | null>(null);
const error = ref<RequestError | string | null>(null);
const otp = ref<string | null>(null);
const requiresTFA = ref(false);
const useMagicLink = ref(false);
const loginLinkSent = ref(false);
const userStore = useUserStore();

watch(email, () => {
	if (requiresTFA.value === true) requiresTFA.value = false;
});

watch(provider, () => {
	email.value = null;
	password.value = null;
	error.value = null;
	otp.value = null;
	requiresTFA.value = false;
});

const errorFormatted = computed(() => {
	// Show "Wrong username or password" for wrongly formatted emails as well
	if (error.value === 'INVALID_PAYLOAD') {
		return translateAPIError('INVALID_CREDENTIALS');
	}

	if (error.value) {
		return translateAPIError(error.value);
	}

	return null;
});

watch(useMagicLink, () => {
	error.value = null;
});

watch(email, () => {
	loginLinkSent.value = false;
});

async function onSubmit() {
	error.value = null;
	// Simple RegEx, not for validation, but to prevent unnecessary login requests when the value is clearly invalid
	const emailRegex = /^\S+@\S+$/;

	if (!useMagicLink.value) {
		if (email.value === null || !emailRegex.test(email.value) || password.value === null) {
			error.value = 'INVALID_PAYLOAD';
			return;
		}

		try {
			loggingIn.value = true;

			const credentials: Credentials = {
				email: email.value,
				password: password.value,
			};

			if (otp.value) {
				credentials.otp = otp.value;
			}

			await login({ provider: provider.value, credentials });

			const redirectQuery = router.currentRoute.value.query.redirect as string;

			let lastPage: string | null = null;

			if (userStore.currentUser && 'last_page' in userStore.currentUser) {
				lastPage = userStore.currentUser.last_page;
			}

			router.push(redirectQuery || lastPage || '/content');
		} catch (err: any) {
			if (err.errors?.[0]?.extensions?.code === 'INVALID_OTP' && requiresTFA.value === false) {
				requiresTFA.value = true;
				error.value = null;
			} else {
				error.value = err.errors?.[0]?.extensions?.code || err;
			}
		} finally {
			loggingIn.value = false;
		}
	} else {
		if (email.value === null || !emailRegex.test(email.value)) {
			error.value = 'INVALID_PAYLOAD';
			return;
		}

		try {
			await api.post(`/auth/login-link/request`, {
				email: email.value,
			});
		} finally {
			loginLinkSent.value = true;
		}
	}
}
</script>

<template>
	<form novalidate @submit.prevent="onSubmit">
		<v-input v-model="email" autofocus autocomplete="username" type="email" :placeholder="t('email')" />

		<v-notice v-if="loginLinkSent" type="success">{{ t('login_link_sent') }}</v-notice>

		<interface-system-input-password
			v-if="!useMagicLink"
			:value="password"
			autocomplete="current-password"
			@input="password = $event"
		/>

		<transition-expand v-if="!useMagicLink">
			<v-input
				v-if="requiresTFA"
				v-model="otp"
				type="text"
				autocomplete="one-time-code"
				:placeholder="t('otp')"
				autofocus
			/>
		</transition-expand>

		<v-notice v-if="error" type="warning">
			{{ errorFormatted }}
		</v-notice>

		<div v-if="!useMagicLink" class="buttons">
			<v-button class="sign-in" type="submit" :loading="loggingIn" large>
				<v-text-overflow :text="t('sign_in')" />
			</v-button>
			<router-link to="/reset-password" class="forgot-password">
				{{ t('forgot_password') }}
			</router-link>
		</div>

		<v-button v-if="useMagicLink" type="submit" :loading="loggingIn" large fullWidth>
			<v-text-overflow :text="t('get_login_link')" />
		</v-button>

		<v-button
			:style="{ marginTop: '20px' }"
			type="button"
			@click="useMagicLink = !useMagicLink"
			large
			fullWidth
			outlined
		>
			<v-text-overflow :text="useMagicLink ? t('login_with_email_and_password') : t('login_with_email_only')" />
		</v-button>
	</form>
</template>

<style lang="scss" scoped>
.v-input,
.v-notice {
	margin-bottom: 20px;
}

.buttons {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.forgot-password {
	color: var(--theme--foreground-subdued);
	transition: color var(--fast) var(--transition);

	&:hover {
		color: var(--theme--foreground);
	}
}

.sign-in {
	max-width: 50%;
}
</style>
