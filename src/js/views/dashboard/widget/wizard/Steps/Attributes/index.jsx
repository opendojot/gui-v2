import React, { Fragment, useCallback, useEffect, useState } from 'react';

import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import InputAdornment from '@material-ui/core/InputAdornment';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import TextField from '@material-ui/core/TextField';
import Tooltip from '@material-ui/core/Tooltip';
import CommentIcon from '@material-ui/icons/ColorLens';
import SearchIcon from '@material-ui/icons/Search';
import { FormCheckBox } from 'Components/Checkbox';
import { Paginator, usePaginator } from 'Components/Paginator';
import _ from 'lodash';
import { TextField as FormTextField } from 'mui-rff';
import PropTypes from 'prop-types';
import { GithubPicker } from 'react-color';
import { Field } from 'react-final-form';
import { useTranslation } from 'react-i18next';
import { useDebounce } from 'use-debounce';
import { object2Array, hexToRgb } from 'Utils';

import Wizard from '../../wizard';
import { useStyles } from './style';

const Index = ({ values, validate, acceptedTypes, staticSupported, name }) => {
  const classes = useStyles();
  const { t } = useTranslation(['dashboard']);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchTermDebounced] = useDebounce(searchTerm, 1000);
  const { paginatorData, setPaginatorData, setCurrentPage, setPageSize } = usePaginator('client');

  const sortList = useCallback((list, fieldCompare) => {
    const orderedList = object2Array(list);
    orderedList.sort((item1, item2) => {
      if (item1[fieldCompare] < item2[fieldCompare]) {
        return -1;
      }
      if (item1[fieldCompare] > item2[fieldCompare]) {
        return 1;
      }
      return 0;
    });
    return orderedList;
  }, []);

  const getInitialAttributes = useCallback(() => {
    const attributes = [];

    const orderedDevices = _.isEmpty(values.templates)
      ? sortList(values.devices, 'label')
      : sortList(values.templates, 'label');

    orderedDevices.forEach(device => {
      const orderedAttrs = sortList(device.attrs, 'label');

      const deviceAttributes = orderedAttrs.map(attr => ({
        deviceId: device.id,
        deviceLabel: device.label,
        attributeId: `${device.id}${attr.label}`,
        attributeLabel: attr.label,
        attributeValueType: attr.valueType,
        isDynamic: attr.isDynamic,
      }));
      deviceAttributes.forEach(attr => attributes.push(attr));
    });
    return attributes;
  }, [values.devices, values.templates, sortList]);

  const [initialAttributes] = useState(() => getInitialAttributes());

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTermDebounced, setCurrentPage]);

  useEffect(() => {
    const filtered = !searchTermDebounced
      ? initialAttributes
      : initialAttributes.filter(item => {
          return (
            item.deviceLabel.toLowerCase().includes(searchTermDebounced) ||
            item.attributeLabel.toLowerCase().includes(searchTermDebounced)
          );
        });
    setPaginatorData(filtered);
  }, [initialAttributes, searchTermDebounced, setPaginatorData]);

  const handleSearchChange = useCallback(e => {
    const { value } = e.target;
    setSearchTerm(value ? value.toLowerCase() : '');
  }, []);

  return (
    <Wizard.Page validate={validate}>
      <Grid container direction='column' className={classes.root}>
        <Grid item className={classes.searchContainer}>
          <TextField
            variant='outlined'
            placeholder={t('attributes.search')}
            name='searchAttributes'
            onChange={handleSearchChange}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position='start'>
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <List className={classes.listContainer}>
          {!paginatorData.pageData.length ? (
            <ListItem className={classes.notFound}>
              <ListItemText primary={t('attributes.notFound')} />
            </ListItem>
          ) : (
            paginatorData.pageData.map(item => {
              const {
                deviceId,
                deviceLabel,
                attributeId,
                attributeLabel,
                attributeValueType,
                isDynamic,
              } = item;

              return (
                <ItemRow
                  value={{
                    label: attributeLabel,
                    valueType: attributeValueType,
                  }}
                  meta={{
                    id: deviceId,
                    label: deviceLabel,
                    attributeId,
                  }}
                  attributes={values.attributes}
                  key={`${deviceId}${attributeLabel}`}
                  acceptedTypes={acceptedTypes}
                  staticSupported={staticSupported}
                  isDynamic={isDynamic}
                  name={name}
                />
              );
            })
          )}
        </List>
        <Grid item className={classes.paginationContainer}>
          <Paginator
            totalPages={paginatorData.totalPages}
            currentPage={paginatorData.currentPage}
            pageSize={paginatorData.pageSize}
            onPageChange={(event, currentPage) => setCurrentPage(currentPage)}
            onPageSizeChange={pageSize => setPageSize(pageSize)}
            showFirstButton
            showLastButton
          />
        </Grid>
      </Grid>
    </Wizard.Page>
  );
};

const ColorPickerAdapter = ({ input: { onChange, value }, changeColor }) => {
  return (
    <GithubPicker
      triangle='top-right'
      onChange={props => {
        changeColor(props);
        onChange(props.hex);
      }}
      color={value}
    />
  );
};

const ItemRow = ({ value, meta, attributes, acceptedTypes, staticSupported, isDynamic, name }) => {
  const { id, label, attributeId } = meta;
  const classes = useStyles();
  const labelId = `checkbox-list-label-${attributeId}`;

  const colorBlue = {
    rgb: { r: 0, g: 77, b: 207 },
    hex: '#004dcf',
  };
  const colorBlueDisabled = {
    rgb: { r: 250, g: 250, b: 250 },
    hex: '#004dcf',
  };

  const [isOpen, setIsOpen] = useState(false);
  const [color, setColor] = useState(colorBlueDisabled);
  const [isDisabled, setIsDisabled] = useState(true);

  const { t } = useTranslation(['dashboard']);
  const attributeItem = {
    deviceID: id,
    attributeID: `${attributeId}`,
    deviceLabel: label,
    color: color.hex,
    label: value.label,
    isDynamic,
  };

  useEffect(() => {
    if (isOpen) {
      setIsOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color]);

  useEffect(() => {
    if (attributes && attributes[attributeId] && !isDisabled) {
      if (attributes[attributeId].color === '#FAFAFA') {
        setColor(colorBlue);
      } else {
        setColor({
          rgb: hexToRgb(attributes[attributeId].color),
          hex: attributes[attributeId].color,
        });
      }
    } else {
      setColor(colorBlueDisabled);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDisabled, attributes, setColor]);

  const handleFormat = item => {
    if (item) {
      setIsDisabled(item.attributeID !== attributeId);
      return item.attributeID === attributeId;
    }
    setIsDisabled(true);
    return false;
  };

  const checkCompatibility = useCallback(
    () => !(acceptedTypes.includes(value.valueType) && (isDynamic || staticSupported)),
    [acceptedTypes, staticSupported, value, isDynamic],
  );

  const renderItem = useCallback(() => {
    return (
      <>
        <span className='listTitle'>{`[${label}] ${value.label}`}</span>
        <span className='listId'>{`( ${isDynamic ? 'Dynamic' : 'Static'} )`}</span>
      </>
    );
  }, [isDynamic, label, value.label]);

  return (
    <Fragment key={attributeId}>
      <ListItem role={undefined} disabled={checkCompatibility()}>
        <ListItemIcon>
          <Field
            type='checkbox'
            name={`${name}.${attributeId}`}
            component={FormCheckBox}
            format={handleFormat}
            disabled={checkCompatibility()}
            parse={item => (item ? attributeItem : undefined)}
          />
        </ListItemIcon>
        <Tooltip title={id} placement='bottom-start' disabled>
          <ListItemText id={labelId} primary={renderItem()} />
        </Tooltip>
        <ListItemSecondaryAction className={classes.action}>
          <FormTextField
            label={t('attributes.subtitle')}
            name={`${name}.${attributeId}.description`}
            variant='outlined'
            margin='dense'
            fullWidth={false}
            disabled={isDisabled || checkCompatibility()}
          />
          <Button
            variant='outlined'
            startIcon={<CommentIcon />}
            className={classes.button}
            style={{
              '--red': color.rgb.r,
              '--green': color.rgb.g,
              '--blue': color.rgb.b,
            }}
            onClick={() => setIsOpen(!isOpen)}
            disabled={isDisabled || checkCompatibility()}
          >
            {t('attributes.colorPicker')}
          </Button>
          {isOpen ? (
            <div className={classes.picker}>
              <Field
                name={`${name}.${attributeId}.color`}
                component={ColorPickerAdapter}
                changeColor={setColor}
              />
            </div>
          ) : null}
        </ListItemSecondaryAction>
      </ListItem>
      <Divider />
    </Fragment>
  );
};

Index.defaultProps = {
  acceptedTypes: ['NUMBER', 'BOOLEAN', 'STRING', 'GEO', 'UNDEFINED'],
  staticSupported: true,
};

Index.propTypes = {
  acceptedTypes: PropTypes.arrayOf(
    PropTypes.oneOf(['NUMBER', 'BOOLEAN', 'STRING', 'GEO', 'UNDEFINED']),
  ),
  staticSupported: PropTypes.bool,
  name: PropTypes.string.isRequired,
};

export default Index;
