/* eslint-disable react/sort-comp */

const React = require("react");

const ReactDOM = require("react-dom");

const TextArea = React.createClass({
    propTypes: {
        value: React.PropTypes.string,
        onChange: React.PropTypes.func.isRequired,
        className: React.PropTypes.string,
        labelText: React.PropTypes.string,
        cols: React.PropTypes.number,
        rows: React.PropTypes.number,
        onFocus: React.PropTypes.func,
        onBlur: React.PropTypes.func,
        disabled: React.PropTypes.bool,
    },

    getDefaultProps: function() {
        return {
            value: "",
            disabled: false,
        };
    },

    render: function() {
        const {labelText, ...props} = this.props;
        return (
            <textarea
                {...props}
                type="text"
                aria-label={labelText}
                onChange={e => this.props.onChange(e.target.value)}
            />
        );
    },

    focus: function() {
        ReactDOM.findDOMNode(this).focus();
    },

    blur: function() {
        ReactDOM.findDOMNode(this).blur();
    },

    getValue: function() {
        return ReactDOM.findDOMNode(this).value;
    },

    getStringValue: function() {
        return ReactDOM.findDOMNode(this).value.toString();
    },

    setSelectionRange: function(selectionStart, selectionEnd) {
        ReactDOM.findDOMNode(this).setSelectionRange(
            selectionStart,
            selectionEnd
        );
    },

    getSelectionStart: function() {
        return ReactDOM.findDOMNode(this).selectionStart;
    },

    getSelectionEnd: function() {
        return ReactDOM.findDOMNode(this).selectionEnd;
    },
});

module.exports = TextArea;
