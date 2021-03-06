import { all } from 'redux-saga/effects';
import drilldownSagas from './drilldown';
import hammurabiSagas from './hammurabi';
import refusalsSagas from './refusals';
import genericSagas from './generic';

export default function* rootSaga() {
  yield all([
    ...drilldownSagas,
    ...genericSagas,
    ...hammurabiSagas,
    ...refusalsSagas
  ]);
}
