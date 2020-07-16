import React, {
  useState,
  useEffect,
  useReducer,
  useCallback,
  Fragment,
} from 'react';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import {
  General,
  Devices,
  Attributes,
  InitialStateGeneral as general,
  Summary,
} from 'Components/Steps';
import { connect } from 'react-redux';
import { menuSelector } from 'Selectors/baseSelector';
import {
  devicesList,
  devicesListPaginationControl,
} from 'Selectors/devicesSelector';
import { actions as deviceActions } from 'Redux/devices';
import { actions as dashboardActions } from 'Redux/dashboard';
import { v4 as uuidv4 } from 'uuid';
import ViewContainer from '../../../ViewContainer';
import useStyles from './Wizard';

const getSteps = () => {
  return ['Geral', 'Dispositivos', 'Atributos', 'Resumo'];
};

const mapStateToProps = state => ({
  ...menuSelector(state),
  ...devicesList(state),
  ...devicesListPaginationControl(state),
});

const mapDispatchToProps = {
  ...deviceActions,
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
  const { getDevices, devices, paginationControl } = props;
  const classes = useStyles();
  const { area } = __CONFIG__;
  const [searchDeviceTerm, setSearchDeviceTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(paginationControl.currentPage);

  // TODO verificar se haverá possibilidade de mudar o número de registros por página
  const [pageSize] = useState(5);

  useEffect(() => {
    getDevices({
      page: { number: currentPage, size: pageSize },
      filter: { label: searchDeviceTerm },
    });
  }, [searchDeviceTerm, getDevices, currentPage, pageSize]);

  const handleSearchChange = useCallback(searchTerm => {
    setSearchDeviceTerm(searchTerm);
  }, []);

  const handlePageChange = useCallback((event, page) => {
    setCurrentPage(page);
  }, []);

  const generateAreaConfig = state => {
    const { attributes, general: generalState } = state;

    const meta = {
      title: generalState.name || '',
      subTitle: generalState.description || '',
    };
    const areaProps = attributes.map(item => ({
      type: 'monotone',
      dataKey: item.attributeID,
      stroke: item.color,
      fillOpacity: 1,
      fill: `url(#color${item.attributeID})`,
      name: item.description || item.label,
    }));
    const defsProps = attributes.map(item => ({
      id: `color${item.attributeID}`,
      x1: '0',
      y1: '0',
      x2: '0',
      y2: '1',
      color: item.color,
    }));

    return { areaProps, defsProps, meta };
  };

  const createNewWidget = attributes => {
    const widgetId = `${area}/${uuidv4()}`;
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
    props.addWidget(newWidget);
    props.addWidgetConfig({ [widgetId]: generateAreaConfig(attributes) });
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
        props.toDashboard();
        return {};
      default:
        return {};
    }
  }, []);

  const [state, dispatch] = useReducer(memoizedReducer, initialState);

  const { isMenuOpen } = props;

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
            initialState={devices}
            selectedValues={state.devices}
            handleClick={dispatch}
            steps={steps}
            activeStep={stepIndex}
            isOpen={isMenuOpen}
            onFilter={handleSearchChange}
            usePagination
            totalPages={paginationControl.totalPages}
            onPageChange={handlePageChange}
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
      <ViewContainer headerTitle="Grafico de Área">
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
