/* eslint-disable brace-style, comma-dangle, indent, no-undef, no-var, object-curly-spacing, react/forbid-prop-types, react/prop-types, react/sort-comp */
/* TODO(csilvers): fix these lint errors (http://eslint.org/docs/rules): */
/* To fix, remove an entry above, run ka-lint, and fix errors. */

var classNames = require("classnames");
var React = require("react");
var _ = require("underscore");
const {StyleSheet, css} = require("aphrodite");
const styleConstants = require("../styles/constants.js");

var TextArea = require("../components/text-area.jsx");

var ApiClassNames = require("../perseus-api.jsx").ClassNames;
var ApiOptions = require("../perseus-api.jsx").Options;
const {
    linterContextProps,
    linterContextDefault,
} = require("../gorgon/proptypes.js");

var FreeTextInput = React.createClass({
    propTypes: {
        currentValue: React.PropTypes.string,
        currentMultipleValues: React.PropTypes.arrayOf(React.PropTypes.string),
        apiOptions: ApiOptions.propTypes,
        labelText: React.PropTypes.string,
        trackInteraction: React.PropTypes.func.isRequired,
        widgetId: React.PropTypes.string.isRequired,
        linterContext: linterContextProps,
        cols: React.PropTypes.number,
        rows: React.PropTypes.number,
    },

    getDefaultProps: function() {
        return {
            currentValue: "",
            apiOptions: ApiOptions.defaults,
            labelText: "",
            linterContext: linterContextDefault,
            cols: 50,
            rows: 5,
        };
    },

    getInitialState: function() {
        return {};
    },

    getClasses: function() {
        const classes = {};
        classes["perseus-input-size-" + this.props.size] = true;
        classes[ApiClassNames.UNANSWERED] = rubric && !this.props.currentValue;
        return classes;
    },

    render: function() {
        const classes = this.getClasses();

        var labelText = this.props.labelText;
        if (labelText == null || labelText === "") {
            labelText = i18n._("Your answer:");
        }
        return <TextArea
            ref="input"
            value={this.props.currentValue}
            cols={this.props.cols}
            rows={this.props.rows}
            onChange={this.handleChange}
            className={classNames(classes, css(styles.textInput))}
            labelText={labelText}
            onFocus={this._handleFocus}
            onBlur={this._handleBlur}
            id={this.props.widgetId}
            disabled={this.props.apiOptions.readOnly}
            highlightLint={this.props.highlightLint}
        />
    },

    handleChange: function(newValue, cb) {
        this.props.onChange({currentValue: newValue}, cb);
        this.props.trackInteraction();
    },

    _handleFocus: function() {
        this.props.onFocus([]);
        // HACK(kevinb): We want to dismiss the feedback popover that webapp
        // displays as soon as a user clicks in in the input field so we call
        // interactionCallback directly.
        const {interactionCallback} = this.props.apiOptions;
        if (interactionCallback) {
            interactionCallback();
        }
    },

    _handleBlur: function() {
        this.props.onBlur([]);
    },

    focus: function() {
        this.refs.input.focus();
        return true;
    },

    focusInputPath: function(inputPath) {
        this.refs.input.focus();
    },

    blurInputPath: function(inputPath) {
        this.refs.input.blur();
    },

    getInputPaths: function() {
        // The widget itself is an input, so we return a single empty list to
        // indicate this.
        return [[]];
    },

    getGrammarTypeForPath: function(inputPath) {
        return "string";
    },

    setInputValue: function(path, newValue, cb) {
        this.props.onChange(newValue, cb);
    },

    getUserInput: function() {
        return this.props.currentValue;
    },

    simpleValidate: function(rubric) {
        return FreeTextInput.validate(this.getUserInput(), rubric);
    },

});

_.extend(FreeTextInput, {
    validate: function(state, rubric) {
        var createValidator = answer =>
            KhanAnswerTypes.text.createValidatorFunctional(answer.value, {
                exact: state.exact,
            });

        var currentValue = state.currentValue;
        var correctAnswers = _.where(rubric.answers, {status: "correct"});

        // Look through all correct answers for one that matches either
        // precisely or approximately and return the appropriate message:
        // - if precise, return the message that the answer came with
        // - if it needs to be simplified, etc., show that message
        var result = _.find(
            _.map(correctAnswers, answer => {
                var localValue = currentValue;
                var validate = createValidator(answer);
                return validate(localValue);
            }),
            match => match.correct || match.empty
        );

        if (!result) {
            // Otherwise, if the guess is not correct
            var otherAnswers = [].concat(
                _.where(rubric.answers, {status: "ungraded"}),
                _.where(rubric.answers, {status: "wrong"})
            );

            // Look through all other answers and if one matches either
            // precisely or approximately return the answer's message
            const match = _.find(otherAnswers, answer => {
                var validate = createValidator(answer);
                return validate(currentValue).correct;
            });
            result = {
                empty: match ? match.status === "ungraded" : false,
                correct: match ? match.status === "correct" : false,
                message: match ? match.message : null,
                guess: currentValue,
            };
        }

        if (result.empty) {
            return {
                type: "invalid",
            };
        } else {
            return {
                type: "points",
                earned: result.correct ? 1 : 0,
                total: 1,
            };
        }
    },
});

const styles = StyleSheet.create({
    textInput: {
        float: "right",
        width: 170,
        marginBottom: 10,
        border: `1px solid ${styleConstants.gray76}`,
        borderRadius: 4,
        padding: `9px 25px 9px 9px`,

        ':focus': {
            outline: 'none',
            border: `2px solid ${styleConstants.kaGreen}`,
            padding: `8px 25px 8px 8px`,
        },
    },
});

module.exports = {
    name: "free-text-input",
    displayName: "Free response text box",
    defaultAlignment: "inline-block",
    accessible: true,
    widget: FreeTextInput,
    isLintable: true,
};
