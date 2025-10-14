export type TargetField =
  | 'first_name'
  | 'last_name'
  | 'date_of_birth'
  | 'email'
  | 'phone'
  | 'gender'
  | 'studio_code'
  | 'title'
  | 'dance_category'
  | 'classification'
  | 'age_group'
  | 'entry_size_category'
  | 'choreographer'
  | 'special_requirements'
  | 'participants';

export const FIELD_SYNONYMS: Record<TargetField, string[]> = {
  first_name: ['first', 'fname', 'first name', 'given', 'f_name', 'forename'],
  last_name: ['last', 'lname', 'last name', 'surname', 'l_name', 'family name'],
  date_of_birth: ['dob', 'birth', 'birth date', 'birthday', 'date of birth', 'd.o.b.'],
  email: ['email', 'e-mail', 'mail'],
  phone: ['phone', 'mobile', 'cell', 'telephone', 'tel'],
  gender: ['gender', 'sex'],
  studio_code: ['studio code', 'studio', 'school code', 'school'],
  title: ['title', 'routine title', 'entry title', 'name', 'routine'],
  dance_category: ['category', 'style', 'dance', 'genre'],
  classification: ['classification', 'class', 'division', 'group size', 'size'],
  age_group: ['age group', 'age', 'division age'],
  entry_size_category: ['size category', 'size', 'group size'],
  choreographer: ['choreographer', 'choreo', 'choreography by'],
  special_requirements: ['props', 'notes', 'requirements', 'special requirements', 'comments'],
  participants: ['participants', 'dancers', 'names', 'performers'],
};

