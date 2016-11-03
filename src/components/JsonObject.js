/*
 * Author: Alexandre Havrileck (Oxyno-zeta)
 * Date: 18/10/16
 * Licence: See Readme
 */
/* ************************************* */
/* ********       IMPORTS       ******** */
/* ************************************* */
import React, { Component, PropTypes } from 'react';
import JsonNode from './JsonNode';
import JsonAddValue from './JsonAddValue';
import objectTypes from '../utils/objectTypes';
import { ADD_DELTA_TYPE, REMOVE_DELTA_TYPE, UPDATE_DELTA_TYPE } from '../utils/deltaTypes';

const { getObjectType } = objectTypes;

/* ************************************* */
/* ********      VARIABLES      ******** */
/* ************************************* */
// Prop types
const propTypes = {
    data: PropTypes.object.isRequired,
    name: PropTypes.string.isRequired,
    isCollapsed: PropTypes.func.isRequired,
    keyPath: PropTypes.array,
    deep: PropTypes.number,
    handleRemove: PropTypes.func,
    onUpdate: PropTypes.func.isRequired,
    onDeltaUpdate: PropTypes.func.isRequired,
    readOnly: PropTypes.bool.isRequired,
    dataType: PropTypes.string,
    getStyle: PropTypes.func.isRequired,
    addButtonElement: PropTypes.element,
    cancelButtonElement: PropTypes.element,
    editButtonElement: PropTypes.element,
    inputElement: PropTypes.element,
};
// Default props
const defaultProps = {
    keyPath: [],
    deep: 0,
};

/* ************************************* */
/* ********      COMPONENT      ******** */
/* ************************************* */
class JsonObject extends Component {
    constructor(props) {
        super(props);
        const deep = props.deep + 1;
        const keyPath = (deep === 0) ? [] : [
            ...props.keyPath,
            props.name,
        ];
        this.state = {
            name: props.name,
            data: props.data,
            keyPath,
            deep,
            collapsed: props.isCollapsed(keyPath, deep),
            addFormVisible: false,
        };

        // Bind
        this.handleCollapseMode = this.handleCollapseMode.bind(this);
        this.handleRemoveValue = this.handleRemoveValue.bind(this);
        this.handleAddMode = this.handleAddMode.bind(this);
        this.handleAddValueAdd = this.handleAddValueAdd.bind(this);
        this.handleAddValueCancel = this.handleAddValueCancel.bind(this);
        this.handleEditValue = this.handleEditValue.bind(this);
        this.onChildUpdate = this.onChildUpdate.bind(this);
        this.renderCollapsed = this.renderCollapsed.bind(this);
        this.renderNotCollapsed = this.renderNotCollapsed.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        this.setState({
            data: nextProps.data,
        });
    }

    onChildUpdate(childKey, childData) {
        const { data, keyPath } = this.state;
        // Update data
        data[childKey] = childData;
        // Put new data
        this.setState({
            data,
        });
        // Spread
        const { onUpdate } = this.props;
        const size = keyPath.length;
        onUpdate(keyPath[size - 1], data);
    }

    handleAddMode() {
        this.setState({
            addFormVisible: true,
        });
    }

    handleAddValueCancel() {
        this.setState({
            addFormVisible: false,
        });
    }

    handleAddValueAdd({ key, value }) {
        const { data, keyPath, deep } = this.state;
        // Update data
        data[key] = value;
        this.setState({
            data,
        });
        // Cancel add to close
        this.handleAddValueCancel();
        // Spread new update
        const { onUpdate, onDeltaUpdate } = this.props;
        onUpdate(keyPath[keyPath.length - 1], data);
        // Spread delta update
        onDeltaUpdate({
            type: ADD_DELTA_TYPE,
            keyPath,
            deep,
            key,
            value,
        });
    }

    handleRemoveValue(key) {
        const { data, keyPath, deep } = this.state;
        return () => {
            const objType = getObjectType(data[key]);
            let deltaUpdateResult = null;
            if (objType === 'Object' || objType === 'Array') {
                deltaUpdateResult = {
                    type: UPDATE_DELTA_TYPE,
                    keyPath,
                    deep,
                    key,
                    oldValue: data[key],
                    newValue: null,
                };
                data[key] = null;
            } else {
                deltaUpdateResult = {
                    type: REMOVE_DELTA_TYPE,
                    keyPath,
                    deep,
                    key,
                    oldValue: data[key],
                };
                delete data[key];
            }
            this.setState({
                data,
            });
            // Spread new update
            const { onUpdate, onDeltaUpdate } = this.props;
            onUpdate(keyPath[keyPath.length - 1], data);
            // Spread delta update
            onDeltaUpdate(deltaUpdateResult);
        };
    }

    handleCollapseMode() {
        this.setState({
            collapsed: !this.state.collapsed,
        });
    }

    handleEditValue({ key, value }) {
        const { data, keyPath, deep } = this.state;
        // Update value
        const oldValue = data[key];
        data[key] = value;
        // Set state
        this.setState({
            data,
        });
        // Spread new update
        const { onUpdate, onDeltaUpdate } = this.props;
        onUpdate(keyPath[keyPath.length - 1], data);
        // Spread delta update
        onDeltaUpdate({
            type: UPDATE_DELTA_TYPE,
            keyPath,
            deep,
            key,
            newValue: value,
            oldValue,
        });
    }

    renderCollapsed() {
        const { name, keyPath, deep, data } = this.state;
        const { handleRemove, readOnly, dataType, getStyle } = this.props;

        const { minus, collapsed } = getStyle(name, data, keyPath, deep, dataType);
        const keyList = Object.getOwnPropertyNames(data);
        const collapseValue = ' {...}';
        const numberOfItems = keyList.length;
        const itemName = (numberOfItems > 1) ? 'keys' : 'key';
        let minusElement = (deep !== 0) ? (<span onClick={handleRemove} style={minus}> - </span>) : null;
        // Check if readOnly is activated
        if (readOnly) {
            minusElement = null;
        }

        return (<span>
            <span style={collapsed} onClick={this.handleCollapseMode}>
                {collapseValue} {numberOfItems} {itemName}
            </span>
            {minusElement}
        </span>);
    }

    renderNotCollapsed() {
        const { name, data, keyPath, deep, addFormVisible } = this.state;
        const {
            isCollapsed,
            handleRemove,
            onDeltaUpdate,
            readOnly,
            getStyle,
            dataType,
            addButtonElement,
            cancelButtonElement,
            editButtonElement,
            inputElement,
            } = this.props;

        const { minus, plus, addForm, ul, delimiter } = getStyle(name, data, keyPath, deep, dataType);
        const keyList = Object.getOwnPropertyNames(data);
        let minusElement = (deep !== 0) ? (<span onClick={handleRemove} style={minus}> - </span>) : null;
        // Check if readOnly is activated
        if (readOnly) {
            minusElement = null;
        }

        const list = keyList
            .map(key => <JsonNode
                key={key}
                name={key}
                data={data[key]}
                keyPath={keyPath}
                deep={deep}
                isCollapsed={isCollapsed}
                handleRemove={this.handleRemoveValue(key)}
                handleUpdateValue={this.handleEditValue}
                onUpdate={this.onChildUpdate}
                onDeltaUpdate={onDeltaUpdate}
                readOnly={readOnly}
                getStyle={getStyle}
                addButtonElement={addButtonElement}
                cancelButtonElement={cancelButtonElement}
                editButtonElement={editButtonElement}
                inputElement={inputElement}
            />);

        const startObject = '{';
        const endObject = '}';

        let menu = addFormVisible ?
            (<span style={addForm}><JsonAddValue
                handleAdd={this.handleAddValueAdd}
                handleCancel={this.handleAddValueCancel}
                addButtonElement={addButtonElement}
                cancelButtonElement={cancelButtonElement}
                inputElement={inputElement}
            /></span>) :
            (<span><span onClick={this.handleAddMode} style={plus}> + </span> {minusElement}</span>);
        // Check if readOnly is activated
        if (readOnly) {
            menu = null;
        }

        return (<span>
            <span style={delimiter}>{startObject}</span>
            <ul style={ul}>
                {list}
            </ul>
            <span style={delimiter}>{endObject}</span>
            {menu}
        </span>);
    }

    render() {
        const { name, collapsed, data, keyPath, deep } = this.state;
        const { getStyle, dataType } = this.props;
        const value = collapsed ? this.renderCollapsed() : this.renderNotCollapsed();
        const style = getStyle(name, data, keyPath, deep, dataType);

        return (
            <div>
                <span onClick={this.handleCollapseMode}>
                    <span style={style.name}>{name} : </span>
                </span>
                {value}
            </div>
        );
    }
}

// Add prop types
JsonObject.propTypes = propTypes;
// Add default props
JsonObject.defaultProps = defaultProps;

/* ************************************* */
/* ********       EXPORTS       ******** */
/* ************************************* */
export default JsonObject;