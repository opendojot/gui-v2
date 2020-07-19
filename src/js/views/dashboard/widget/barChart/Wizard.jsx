import React, {
  useState,
  useEffect,
  useReducer,
  useCallback,
  Fragment,
} from 'react';

import Button from '@material-ui/core/Button';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import Stepper from '@material-ui/core/Stepper';
import Typography from '@material-ui/core/Typography';
import { usePaginator } from 'Components/Paginator';
import {
  General,
  Devices,
  Attributes,
  InitialStateGeneral as general,
  Summary,
} from 'Components/Steps';
import { connect } from 'react-redux';
import { actions as dashboardActions } from 'Redux/dashboard';
import { menuSelector } from 'Selectors/baseSelector';
import { Device as DeviceService } from 'Services';
import { v4 as uuidv4 } from 'uuid';

import ViewContainer from '../../../ViewContainer';
import useStyles from './Wizard';

const getSteps = () => {
  return ['Geral', 'Dispositivos', 'Atributos', 'Resumo'];
};

const mapStateToProps = state => ({
  ...menuSelector(state),
});

const mapDispatchToProps = {
  ...dashboardActions,
};

const initialState = {
  general,
  devices: [],
  attributes: [],
  activeStep: 0,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(props => {
  const { toDashboard, addWidget, addWidgetConfig, isMenuOpen } = props;
  const classes = useStyles();
  const { bar: barID } = __CONFIG__;

  const [searchDeviceTerm, setSearchDeviceTerm] = useState('');
  const {
    paginatorData,
    setPaginatorData,
    setCurrentPage,
    setPageSize,
    setDisablePaginator,
  } = usePaginator();

  useEffect(() => {
    setDisablePaginator(true);
    DeviceService.getDevicesList(
      { number: paginatorData.currentPage, size: paginatorData.pageSize },
      { label: searchDeviceTerm },
    )
      .then(response => {
        const { devices, currentPage, totalPages } = response.getDevices;
        setPaginatorData({ data: devices, currentPage, totalPages });
      })
      .catch(error => {
        console.error(error); // TODO tratamento de erro da api
        setDisablePaginator(false);
      });
  }, [
    setDisablePaginator,
    setPaginatorData,
    paginatorData.currentPage,
    paginatorData.pageSize,
    searchDeviceTerm,
  ]);

  const handleSearchChange = useCallback(
    searchTerm => {
      setSearchDeviceTerm(searchTerm);
      setCurrentPage(1);
    },
    [setCurrentPage],
  );

  const generateBarConfig = state => {
    const { attributes, general: generalState } = state;
    const meta = {
      title: generalState.name || '',
      subTitle: generalState.description || '',
    };
    const bar = attributes.map(item => ({
      dataKey: item.attributeID,
      fill: item.color,
      name: item.description || item.label,
    }));

    return { bar, meta };
  };

  const createNewWidget = attributes => {
    const widgetId = `${barID}/${uuidv4()}`;
    const newWidget = {
      i: widgetId,
      x: 0,
      y: Infinity,
      w: 6,
      h: 10,
      minW: 3,
      minH: 6,
      static: false,
      moved: false,
    };
    addWidget(newWidget);
    addWidgetConfig({ [widgetId]: generateBarConfig(attributes) });
  };

  const memoizedReducer = useCallback((state, { type, payload = {} }) => {
    switch (type) {
      case 'next':
        return {
          ...state,
          [payload.key]: payload.values,
          activeStep: state.activeStep + 1,
        };
      case 'back':
        return {
          ...state,
          activeStep: state.activeStep - 1,
        };
      case 'finish':
        createNewWidget(state);
        toDashboard();
        return {};
      default:
        return {};
    }
  }, []);

  const [state, dispatch] = useReducer(memoizedReducer, initialState);

  const steps = getSteps();

  const handleReset = () => {
    dispatch({ type: 'reset' });
  };

  const getStepContent = stepIndex => {
    switch (stepIndex) {
      case 0:
        return (
          <General
            initialState={state.general}
            handleClick={dispatch}
            steps={steps}
            activeStep={stepIndex}
            isOpen={isMenuOpen}
          />
        );
      case 1:
        return (
          <Devices
            initialState={paginatorData.pageData}
            selectedValues={state.devices}
            handleClick={dispatch}
            steps={steps}
            activeStep={stepIndex}
            isOpen={isMenuOpen}
            onFilter={handleSearchChange}
            usePagination
            currentPage={paginatorData.currentPage}
            pageSize={paginatorData.pageSize}
            totalPages={paginatorData.totalPages}
            onPageSizeChange={pageSize => setPageSize(pageSize)}
            onPageChange={(event, page) => setCurrentPage(page)}
            isLoading={paginatorData.disabled}
          />
        );
      case 2:
        return (
          <Attributes
            initialState={state.devices}
            selectedValues={state.attributes}
            handleClick={dispatch}
            steps={steps}
            activeStep={stepIndex}
            isOpen={isMenuOpen}
          />
        );
      case 3:
        return (
          <Summary
            initialState={{ general: state.general, values: state.attributes }}
            handleClick={dispatch}
            steps={steps}
            activeStep={stepIndex}
            isOpen={isMenuOpen}
          />
        );
      default:
        return 'Unknown stepIndex';
    }
  };

  const { activeStep } = state;

  return (
    <div className={classes.root}>
      <ViewContainer headerTitle="Grafico de Barra">
        <Fragment>
          <Stepper
            classes={{ root: classes.paper }}
            alternativeLabel
            activeStep={activeStep}
          >
            {steps.map(label => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          <div>
            {activeStep === steps.length ? (
              <div>
                <Typography className={classes.instructions}>
                  All steps completed
                </Typography>
                <Button onClick={handleReset}>Reset</Button>
                <Button onClick={() => dispatch({ type: 'back' })}>Back</Button>
              </div>
            ) : (
              getStepContent(activeStep, steps)
            )}
          </div>
        </Fragment>
      </ViewContainer>
    </div>
  );
});
