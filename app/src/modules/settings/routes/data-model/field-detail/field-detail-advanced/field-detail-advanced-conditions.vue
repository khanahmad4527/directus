<script setup lang="ts">
import { DeepPartial, Field } from '@directus/types';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { syncFieldDetailStoreProperty, useFieldDetailStore } from '../store';
import VForm from '@/components/v-form/v-form.vue';

const { t } = useI18n();

const fieldDetailStore = useFieldDetailStore();

const { loading, field, collection } = storeToRefs(fieldDetailStore);

const interfaceId = computed(() => field.value.meta?.interface ?? null);
const conditions = syncFieldDetailStoreProperty('field.meta.conditions');

const valueFieldDef = computed<DeepPartial<Field>>(() => {
	const targetType = field.value.type;

	const base: DeepPartial<Field> = {
		field: 'value',
		name: t('value'),
		type: 'json',
		meta: {
			readonly: true,
			width: 'half',
			conditions: [
				{
					rule: { set_value: { _eq: true } },
					readonly: false,
				},
			],
		},
	};

	if (targetType === 'boolean') {
		base.meta!.interface = 'select-dropdown';

		base.meta!.options = {
			choices: [
				{ text: 'true', value: true },
				{ text: 'false', value: false },
				{ text: 'NULL', value: null },
			],
		};
	} else if (['integer', 'bigInteger', 'float', 'decimal'].includes(targetType as string)) {
		base.meta!.interface = 'input';
		base.meta!.options = { type: 'number', placeholder: t('enter_a_value') };
	} else if (targetType === 'text') {
		base.meta!.interface = 'input-multiline';
		base.meta!.options = { placeholder: t('enter_a_value') };
	} else if (targetType === 'json') {
		base.meta!.interface = 'input-code';
		base.meta!.options = { language: 'JSON', placeholder: t('enter_a_value') };
	} else if (['timestamp', 'dateTime', 'date', 'time'].includes(targetType as string)) {
		base.meta!.interface = 'datetime';
		base.meta!.options = { type: targetType };
	} else {
		base.meta!.interface = 'input';
		base.meta!.options = { placeholder: t('enter_a_value') };
	}

	return base;
});

const conditionsSync = computed({
	get() {
		return { conditions: conditions.value };
	},
	set(value) {
		conditions.value = value.conditions;
	},
});

const conditionsInitial = conditionsSync.value;

const repeaterFields = computed<DeepPartial<Field>[]>(() => [
	{
		field: 'name',
		name: t('name'),
		type: 'string',
		meta: {
			interface: 'input',
			options: {
				iconLeft: 'label',
				placeholder: t('enter_a_value'),
			},
		},
	},
	{
		field: 'rule',
		name: t('rule'),
		type: 'json',
		meta: {
			interface: 'system-filter',
			options: {
				collectionName: collection.value,
				includeRelations: false,
				injectVersionField: true,
			},
		},
	},
	{
		field: 'readonly',
		name: t('readonly'),
		type: 'boolean',
		meta: {
			interface: 'boolean',
			options: {
				label: t('readonly_field_label'),
			},
			width: 'half',
		},
	},
	{
		field: 'required',
		name: t('required'),
		type: 'boolean',
		meta: {
			interface: 'boolean',
			options: {
				label: t('require_value_to_be_set'),
			},
			width: 'half',
		},
	},
	{
		field: 'hidden',
		name: t('hidden'),
		type: 'boolean',
		meta: {
			interface: 'boolean',
			options: {
				label: t('hidden_on_detail'),
			},
			width: 'half',
		},
	},
	{
		field: 'clear_hidden_value_on_save',
		name: t('clear_hidden_field'),
		type: 'boolean',
		meta: {
			interface: 'boolean',
			readonly: true,
			options: {
				label: t('clear_value_on_save_when_hidden'),
			},
			width: 'half',
			conditions: [
				{
					rule: {
						hidden: { _eq: true },
					},
					readonly: false, // enable the field when hidden is true
				},
			],
		},
	},
	{
		field: 'set_value',
		name: t('set_value'),
		type: 'boolean',
		meta: {
			interface: 'boolean',
			options: {
				label: t('set_field_value_when_condition_matches'),
			},
			width: 'half',
		},
	},
	valueFieldDef.value,
	{
		field: 'options',
		name: t('interface_options'),
		collection: collection.value,
		type: 'json',
		meta: {
			interface: 'system-interface-options',
			options: {
				isConditionOptions: true,
				interface: interfaceId.value,
				context: useFieldDetailStore,
			},
		},
	},
]);

const fields = computed<DeepPartial<Field>[]>(() => [
	{
		field: 'conditions',
		name: t('conditions'),
		type: 'json',
		meta: {
			interface: 'list',
			options: {
				fields: repeaterFields,
				template: '{{ name }}',
			},
		},
	},
]);
</script>

<template>
	<VForm v-model="conditionsSync" :initial-values="conditionsInitial" :fields="fields" :loading="loading" />
</template>
