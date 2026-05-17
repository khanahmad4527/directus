import { Field } from '@directus/types';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setConditionalValues } from './set-conditional-values.js';

function makeField(fieldName: string, overrides: Partial<Field> = {}): Field {
	return {
		collection: 'test',
		field: fieldName,
		name: fieldName,
		type: 'string',
		schema: null,
		meta: {
			id: 1,
			collection: 'test',
			field: fieldName,
			special: null,
			interface: 'input',
			options: null,
			display: null,
			display_options: null,
			readonly: false,
			hidden: false,
			sort: 1,
			width: 'full',
			translations: null,
			note: null,
			conditions: null,
			required: false,
			group: null,
			validation: null,
			validation_message: null,
		},
		...overrides,
	} as Field;
}

beforeEach(() => {
	setActivePinia(createTestingPinia({ createSpy: vi.fn }));
});

describe('setConditionalValues', () => {
	it('returns edits unchanged when no fields have conditions', () => {
		const edits = { title: 'hello' };
		const result = setConditionalValues(edits, [makeField('title')], {}, {});
		expect(result).toEqual(edits);
	});

	it('returns edits unchanged when condition does not match', () => {
		const edits = { is_okay: false, status: 'draft' };

		const field = makeField('status', {
			meta: {
				...makeField('status').meta!,
				conditions: [
					{
						name: 'approve when okay',
						rule: { is_okay: { _eq: true } },
						set_value: true,
						value: 'approved',
					},
				],
			},
		});

		const result = setConditionalValues(edits, [field, makeField('is_okay')], {}, {});
		expect(result.status).toBe('draft');
	});

	it('sets the value when condition matches and set_value is true', () => {
		const edits = { is_okay: true, status: 'draft' };

		const field = makeField('status', {
			meta: {
				...makeField('status').meta!,
				conditions: [
					{
						name: 'approve when okay',
						rule: { is_okay: { _eq: true } },
						set_value: true,
						value: 'approved',
					},
				],
			},
		});

		const result = setConditionalValues(edits, [field, makeField('is_okay')], {}, {});
		expect(result.status).toBe('approved');
	});

	it('does not set value when set_value is false', () => {
		const edits = { is_okay: true, status: 'draft' };

		const field = makeField('status', {
			meta: {
				...makeField('status').meta!,
				conditions: [
					{
						name: 'no-op rule',
						rule: { is_okay: { _eq: true } },
						set_value: false,
						value: 'approved',
					},
				],
			},
		});

		const result = setConditionalValues(edits, [field, makeField('is_okay')], {}, {});
		expect(result.status).toBe('draft');
	});

	it('forces set value at save even when user manually changed the field', () => {
		const edits = { is_okay: true, status: 'user_typed_value' };

		const field = makeField('status', {
			meta: {
				...makeField('status').meta!,
				conditions: [
					{
						name: 'approve when okay',
						rule: { is_okay: { _eq: true } },
						set_value: true,
						value: 'approved',
					},
				],
			},
		});

		const result = setConditionalValues(edits, [field, makeField('is_okay')], {}, {});
		expect(result.status).toBe('approved');
	});

	it('supports null as a set value', () => {
		const edits = { is_okay: true, reviewer: 'someone' };

		const field = makeField('reviewer', {
			meta: {
				...makeField('reviewer').meta!,
				conditions: [
					{
						name: 'clear reviewer when okay',
						rule: { is_okay: { _eq: true } },
						set_value: true,
						value: null,
					},
				],
			},
		});

		const result = setConditionalValues(edits, [field, makeField('is_okay')], {}, {});
		expect(result.reviewer).toBeNull();
	});

	it('reads rule context from defaults+item+edits merge', () => {
		const edits = {};
		const item = { is_okay: true };

		const field = makeField('status', {
			meta: {
				...makeField('status').meta!,
				conditions: [
					{
						name: 'approve when okay',
						rule: { is_okay: { _eq: true } },
						set_value: true,
						value: 'approved',
					},
				],
			},
		});

		const result = setConditionalValues(edits, [field, makeField('is_okay')], {}, item);
		expect(result.status).toBe('approved');
	});

	it('returns a new object only when changes occur', () => {
		const edits = { title: 'hello' };
		const result = setConditionalValues(edits, [makeField('title')], {}, {});
		expect(result).toBe(edits);
	});

	it('handles multiple fields with conditions independently', () => {
		const edits = { is_okay: true };

		const status = makeField('status', {
			meta: {
				...makeField('status').meta!,
				conditions: [
					{
						name: 'approve',
						rule: { is_okay: { _eq: true } },
						set_value: true,
						value: 'approved',
					},
				],
			},
		});

		const priority = makeField('priority', {
			meta: {
				...makeField('priority').meta!,
				conditions: [
					{
						name: 'urgent',
						rule: { is_okay: { _eq: true } },
						set_value: true,
						value: 'high',
					},
				],
			},
		});

		const result = setConditionalValues(edits, [status, priority, makeField('is_okay')], {}, {});
		expect(result.status).toBe('approved');
		expect(result.priority).toBe('high');
	});

	it('matches the last condition in array when multiple match (reversed precedence)', () => {
		const edits = { is_okay: true };

		const field = makeField('status', {
			meta: {
				...makeField('status').meta!,
				conditions: [
					{
						name: 'first',
						rule: { is_okay: { _eq: true } },
						set_value: true,
						value: 'first_value',
					},
					{
						name: 'second',
						rule: { is_okay: { _eq: true } },
						set_value: true,
						value: 'second_value',
					},
				],
			},
		});

		const result = setConditionalValues(edits, [field, makeField('is_okay')], {}, {});
		expect(result.status).toBe('second_value');
	});
});
