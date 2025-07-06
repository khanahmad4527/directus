<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { useHead } from '@unhead/vue';
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { loginLink } from '@/auth';
import { translateAPIError } from '@/lang';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const token = computed(() => route.query.token as string);
const error = ref<string | null>(null);

const errorFormatted = computed(() => {
	if (error.value) {
		return translateAPIError(error.value);
	}

	return null;
});

onMounted(async () => {
	try {
		await loginLink({ token: token.value });

		router.push('/content');
	} catch (err: any) {
		error.value = err.errors?.[0]?.extensions?.code || err;
	}
});

useHead({ title: t('logging_you_in') });
</script>

<template>
	<public-view>
		<h1 class="type-title">{{ t('logging_you_in') }}</h1>

		<v-notice :style="{ marginTop: '20px' }" v-if="error" type="danger">
			{{ errorFormatted }}
		</v-notice>
	</public-view>
</template>
