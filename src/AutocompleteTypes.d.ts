import { ItemByCollection } from './AutocompleteManager';

type Item = ItemByCollection[keyof ItemByCollection];

export { Item };
