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
const {iconDropdownArrow} = require("../icon-paths.js");
const InlineIcon = require("../components/inline-icon.jsx");

var answerFormButtons = [
    {title: "Free Response", value: "text", content: "Any text at all"}
];

var formExamples = {
    text: form => form.free ? i18n._("your answer will be saved but not graded") : i18n._("a few words"),
};

var FreeTextInput = React.createClass({
    propTypes: {
        currentValue: React.PropTypes.string,
        currentMultipleValues: React.PropTypes.arrayOf(React.PropTypes.string),
        apiOptions: ApiOptions.propTypes,
        answerForms: React.PropTypes.arrayOf(
            React.PropTypes.shape({
                name: React.PropTypes.string.isRequired,
                // Whether we are doing exact matching or just collecting free response
                free: React.PropTypes.bool,
            })
        ),
        labelText: React.PropTypes.string,
        trackInteraction: React.PropTypes.func.isRequired,
        widgetId: React.PropTypes.string.isRequired,
        linterContext: linterContextProps,
    },

    getDefaultProps: function() {
        return {
            currentValue: "",
            size: "normal",
            apiOptions: ApiOptions.defaults,
            answerForms: [],
            labelText: "",
            linterContext: linterContextDefault,
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
            onChange={this.handleChange}
            className={classNames(classes, css(styles.textInput))}
            labelText={labelText}
            examples={this.examples()}
            shouldShowExamples={this.shouldShowExamples()}
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

    shouldShowExamples: function() {
        var noFormsAccepted = this.props.answerForms.length === 0;
        // To check if all answer forms are accepted, we must first
        // find the *names* of all accepted forms, and see if they are
        // all present, ignoring duplicates
        var answerFormNames = _.uniq(
            this.props.answerForms.map(form => form.name)
        );
        var allFormsAccepted = answerFormNames.length >= _.size(formExamples);
        return !noFormsAccepted && !allFormsAccepted;
    },

    examples: function() {
        // if the set of specified forms are empty, allow all forms
        var forms =
            this.props.answerForms.length !== 0
                ? this.props.answerForms
                : _.map(_.keys(formExamples), name => {
                      return {
                          name: name,
                      };
                  });

        var examples = _.map(forms, form => {
            return formExamples[form.name](form);
        });
        // Ensure no duplicate tooltip text from simplified and unsimplified
        // versions of the same format
        examples = _.uniq(examples);

        return [i18n._("**Your answer should be** ")].concat(examples);
    },
});

_.extend(FreeTextInput, {
    validate: function(state, rubric) {
        var allAnswerForms = _.pluck(answerFormButtons, "value");

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

// TODO(thomas): Currently we receive a list of lists of acceptable answer types
// and union them down into a single set. It's worth considering whether it
// wouldn't make more sense to have a single set of acceptable answer types for
// a given *problem* rather than for each possible [correct/wrong] *answer*.
// When should two answers to a problem take different answer types?
// See D27790 for more discussion.
var unionAnswerForms = function(answerFormsList) {
    // Takes a list of lists of answer forms, and returns a list of the forms
    // in each of these lists in the same order that they're listed in the
    // `formExamples` forms from above.

    // uniqueBy takes a list of elements and a function which compares whether
    // two elements are equal, and returns a list of unique elements. This is
    // just a helper function here, but works generally.
    var uniqueBy = function(list, iteratee) {
        return _.reduce(
            list,
            (uniqueList, element) => {
                // For each element, decide whether it's already in the list of
                // unique items.
                var inList = _.find(uniqueList, iteratee.bind(null, element));
                if (inList) {
                    return uniqueList;
                } else {
                    return uniqueList.concat([element]);
                }
            },
            []
        );
    };

    // Pull out all of the forms from the different lists.
    var allForms = _.flatten(answerFormsList);
    // Pull out the unique forms using uniqueBy.
    var uniqueForms = uniqueBy(allForms, _.isEqual);
    // Sort them by the order they appear in the `formExamples` list.
    return _.sortBy(uniqueForms, form => {
        return _.keys(formExamples).indexOf(form.name);
    });
};

var propsTransform = function(editorProps) {
    var rendererProps = _.extend(_.omit(editorProps, "answers"), {
        answerForms: unionAnswerForms(
            _.map(editorProps.answers, answer => {
                return _.map(answer.answerForms, form => {
                    return {
                        name: form,
                    };
                });
            })
        ),
    });

    return rendererProps;
};

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
    transform: propsTransform,
    isLintable: true,
};
