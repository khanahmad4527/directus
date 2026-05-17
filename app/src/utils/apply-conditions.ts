import { Condition, Field } from '@directus/types';
import { validatePayload } from '@directus/utils';
import { isArray, mergeWith } from 'lodash';
import type { ContentVersionMaybeNew } from '@/types/versions';
import { parseFilter } from '@/utils/parse-filter';

export function findMatchingCondition(
	item: Record<string, any>,
	field: Field,
	version: ContentVersionMaybeNew | null = null,
): Condition | undefined {
	if (!field.meta || !Array.isArray(field.meta?.conditions)) return undefined;

	const conditions = [...field.meta.conditions].reverse();

	return conditions.find((condition) => {
		if (!condition.rule || Object.keys(condition.rule).length !== 1) return;

		const validationContext = {
			...item,
			$version: version?.name ?? null,
		};

		const rule = parseFilter(condition.rule);
		const errors = validatePayload(rule, validationContext, { requireAll: true });
		return errors.length === 0;
	});
}

export function applyConditions(
	item: Record<string, any>,
	field: Field,
	version: ContentVersionMaybeNew | null = null,
) {
	if (field.meta && Array.isArray(field.meta?.conditions)) {
		const matchingCondition = findMatchingCondition(item, field, version);

		if (matchingCondition) {
			const updatedField = {
				...field,
				meta: mergeWith(
					{},
					field.meta || {},
					{
						readonly: matchingCondition.readonly,
						options: matchingCondition.options,
						hidden: matchingCondition.hidden,
						required: matchingCondition.required,
						clear_hidden_value_on_save: matchingCondition.clear_hidden_value_on_save,
						set_value: matchingCondition.set_value,
						value: matchingCondition.set_value ? matchingCondition.value : undefined,
					},
					(objValue, srcValue) => {
						if (isArray(objValue) && isArray(srcValue)) {
							return srcValue;
						}

						return undefined;
					},
				),
			};

			return updatedField;
		}
	}

	return field;
}
