import { Field, Item } from '@directus/types';
import { cloneDeep } from 'lodash';
import { findMatchingCondition } from './apply-conditions';
import { mergeItemData } from './merge-item-data';

export function setConditionalValues(edits: Item, fields: Field[], defaultValues: any, item: any): Item {
	const currentValues = mergeItemData(defaultValues, item, edits);

	const fieldsToSet: Map<string, any> = new Map();

	for (const field of fields) {
		if (!field.meta?.conditions?.length) continue;

		const matched = findMatchingCondition(currentValues, field);
		if (!matched?.set_value) continue;

		fieldsToSet.set(field.field, matched.value);
	}

	if (fieldsToSet.size === 0) return edits;

	const result = cloneDeep(edits);

	for (const [field, value] of fieldsToSet) {
		result[field] = value;
	}

	return result;
}
