var TextArea = React.createClass({
    propTypes: {
        value: React.PropTypes.string,
        cols: React.PropTypes.number,
        rows: React.PropTypes.number,
        onChange: React.PropTypes.func.isRequired,
        className: React.PropTypes.string,
        onFocus: React.PropTypes.func,
        onBlur: React.PropTypes.func
    },

    getDefaultProps: function() {
        return {
            value: ""
        };
    },

    render: function() {
        return <textarea
            {...this.props}
            onChange={(e) => this.props.onChange(e.target.value)} />;
    },

    focus: function() {
        this.getDOMNode().focus();
    },

    blur: function() {
        this.getDOMNode().blur();
    },

    getValue: function() {
        return this.getDOMNode().value;
    },

    getStringValue: function() {
        return this.getDOMNode().value.toString();
    },

    setSelectionRange: function(selectionStart, selectionEnd) {
        this.getDOMNode().setSelectionRange(selectionStart, selectionEnd);
    },

    getSelectionStart: function() {
        return this.getDOMNode().selectionStart;
    },

    getSelectionEnd: function() {
        return this.getDOMNode().selectionEnd;
    }

});

module.exports = TextArea;
