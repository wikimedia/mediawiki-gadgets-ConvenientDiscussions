import { ItemByCollection } from './Autocomplete';

type Item = ItemByCollection[keyof ItemByCollection];

export { Item };
