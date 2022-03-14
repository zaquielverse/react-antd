import React, { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux'
import { useReducer, useState } from 'reinspect';
import Header from "components/Header";
import { createServerFunc } from 'helpers/mockServer';
import PivotGrid from 'components/PivotGrid';
import { constants, endpoints, heights } from '../helpers/consts';
import { PivotGridProps } from 'components/PivotGrid/PivotGrid';
import { Button, Checkbox, Descriptions, InputNumber, Layout, Select, Tooltip } from 'antd';
import 'antd/dist/antd.css';
import { BasicObject } from '../interfaces/common';
import { getSessionStorage, setSessionStorage } from '../helpers/sessionStorage';
import Toolbar from 'components/Toolbar';
import Filters from 'components/Filters';
import { reducer } from '../helpers/store';
const { Content, Sider } = Layout;

const { Option } = Select;

const GROUP_BY_COLUMNS = ['country', 'area', 'storageZone'];

const defaultInfoGrid: PivotGridProps = {
  rows: [],
  columns: [],
  groupBy: GROUP_BY_COLUMNS
};

const defaultFilters = {
  area: [],
  country: [],
  storageZone: [],
  jobsLastDayLastMonthCount: {
    min: null,
    max: null
  },
  jobsLastDayLastQuarterCount: {
    min: null,
    max: null
  },
  jobsTodayCount: {
    min: null,
    max: null
  },
  jobsYesterdayCount: {
    min: null,
    max: null
  },
};

interface Filter {
  area: string[];
  country: string[];
  storageZone: string[];
}

const SCREEN = 'hammurabi';
const ELEMENTS = ['grid'];

function Hammurabi() {

  const [state, dispatch] = useReducer(reducer, {}, state => state, "hammurabiReducer");

  const stateRedux = useSelector((state) => state)
  console.log("stateRedux: ", stateRedux);

  const [infoGrid, setInfoGrid] = useState(defaultInfoGrid, "infoGrid");
  const [filters, setFilters] = useState<Filter>(defaultFilters, "filterGrid");

  const { rows, columns, groupBy } = infoGrid;

  const setNewFilters = (newFilters: any) => {
    setSessionStorage("filters", newFilters);
    setFilters(newFilters);
  }

  useEffect(() => {
    setSessionStorage("filters", filters);
  }, [filters])

  const filteredRows = useMemo(() => {
    const currentFilters: BasicObject = filters;
    return infoGrid.rows.filter((r) => {
      // const { area, country, storageZone } = r;
      const validRecord = columns.every(({ key }) => {
        const valueFilter: any = currentFilters[key];
        const valueColumn = r[key];
        if (Array.isArray(valueFilter)) {
          if (!valueFilter.length || valueFilter.includes(valueColumn)) return true;
          return false
        } else {
          if ((!valueFilter.min || valueFilter.min <= valueColumn) && (!valueFilter.max || valueFilter.max >= valueColumn)) {
            return true;
          }
          return false
        }
        return false;
      });
      return validRecord;
    });
  }, [infoGrid.rows, filters]);

  useEffect(() => {
    createServerFunc();
    dispatch({ type: 'hammurabi_grid_requested', payload: {}, screen: SCREEN, elements: ELEMENTS});
    fetch(endpoints.hammurabi.url)
      .then((resp) => resp.json())
      .then((response) => {
        const rows = response.data;
        const firstElement = rows[0];
        dispatch({ type: 'hammurabi_grid_succeeded', payload: { data: { data: rows, pagination: response.pagination } }, screen: SCREEN, elements: ELEMENTS});
        if (firstElement) {
          const columns = Object.keys(firstElement).filter((key) => key !== 'objectsInMultipleJobsCount' && (key.includes('Count') || infoGrid.groupBy.includes(key)));
          const columnsResponse = columns.map((key: string) => ({
            headerCellClass: 'filter-cell',
            headerRenderer: (info: any) => {
              const { column: { name } } = info;
              const currentFilters: BasicObject = getSessionStorage("filters");
              if (!infoGrid.groupBy.includes(name))
                return (
                  <>
                    <div className="flex1">{name}</div>
                    <div className="flex">
                      <InputNumber
                        className="flex1"
                        defaultValue={currentFilters[key].min}
                        onChange={(value) => {
                          currentFilters[key].min = value;
                          setNewFilters(currentFilters);
                        }}
                        placeholder="min"
                      />
                      <InputNumber
                        className="flex1"
                        defaultValue={currentFilters[key].max}
                        onChange={(value) => {
                          currentFilters[key].max = value;
                          setNewFilters(currentFilters);
                        }}
                        placeholder="max"
                      />
                    </div>
                  </>
                );
              const options: string[] = [];
              rows.forEach((rowInfo: any) => {
                const value = rowInfo[key];
                const alreadyExist = value && options.includes(value);
                if (value && !alreadyExist) options.push(value);
              });

              const filtersSession = getSessionStorage("filters");

              return (
                <>
                  <div>{key}</div>
                  <Select
                    defaultValue={filtersSession[key]}
                    mode="multiple"
                    onChange={(value) => {
                      const newFilters = { ...filtersSession };
                      newFilters[key] = value;
                      setNewFilters(newFilters);
                    }}
                    placeholder={`${key} filter...`}
                    style={{ width: '100%' }}
                  >
                    {options.map((option) => (
                      <Option key={`${key}-${option}`} value={option}>{option}</Option>
                    ))}
                  </Select>
                </>
              );
            },
            key,
            groupFormatter: function (props: any) {
              const { childRows, groupKey } = props;
              if (!key.includes('Count')) return <>{groupKey}</>;
              return (
                <Button
                  onClick={() => {
                    const firstElement = childRows[0];
                    const filters: BasicObject = {};
                    infoGrid.groupBy.forEach((keyGroupBy) => {
                      filters[keyGroupBy] = firstElement[keyGroupBy];
                    });

                    childRows.forEach((rowInfo: any) => {
                      infoGrid.groupBy.forEach((keyGroupBy) => {
                        if (filters[keyGroupBy] && filters[keyGroupBy] !== rowInfo[keyGroupBy]) {
                          delete filters[keyGroupBy];
                        }
                      });
                    });
                  }}
                >
                  {childRows.reduce((prev: number, value: BasicObject) => prev + value[key], 0)}
                </Button>);
            },
            name: key,
          }));

          setInfoGrid({ ...infoGrid, columns: columnsResponse, rows: response.data });
        }
      });
  }, []);

  return (
    <Layout className="site-layout-background width100 height100">
      <Sider className="site-layout-background" width={200}>
        <Filters
          filters={[
            {
              element: 'Input',
              key: 'input',
              placeholder: "Basic usage"
            },
            {
              element: "Select",
              key: 'select',
              options: [{
                label: 'label1',
                value: 'value1'
              },
                {
                  label: 'label2',
                  value: 'value2'
                }],
            },
            {
              element: "DatePicker",
              format: "DD-MM-YYYY",
              key: 'date',
            }
          ]}
          getFilters={(filter) => {
            console.log("filter: ", filter);
          }}
        />
      </Sider>
      <Content>
        <div className="flex-column">
          <Header title="Hammurabi Jobs" />
          <Toolbar>
            {GROUP_BY_COLUMNS.map((key) => (
              <Checkbox
                defaultChecked={!!infoGrid.groupBy.includes(key)}
                key={key}
                onChange={(checkbox) => {
                  const value = checkbox.target.checked;
                  let newGroupByList: string[] = JSON.parse(JSON.stringify(infoGrid.groupBy));
                  if (value) {
                    newGroupByList.push(key);
                  } else {
                    newGroupByList = newGroupByList.filter((column: string) => column !== key);
                  }
                  setInfoGrid({ ...infoGrid, groupBy: newGroupByList });
                }}
              >
                {key}
              </Checkbox>
            ))}
          </Toolbar>
          {rows && (
            <div className="flex1">
              <PivotGrid
                columns={columns}
                groupBy={groupBy}
                height={window.innerHeight - heights.header - heights.toolbar}
                rows={filteredRows}
                restProps={{
                  headerRowHeight: 75
                }}
              />
            </div>
          )}
        </div>
      </Content>
    </Layout>
  );
}

export default Hammurabi;
