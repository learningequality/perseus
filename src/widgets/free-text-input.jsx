var classNames = require("classnames");
var React = require('react');
var _ = require("underscore");

var Changeable    = require("../mixins/changeable.jsx");
var EditorJsonify = require("../mixins/editor-jsonify.jsx");

var ButtonGroup = require("react-components/button-group.jsx");
var InfoTip = require("react-components/info-tip.jsx");
var TextArea = require("../components/text-area.jsx");
var MultiButtonGroup = require("react-components/multi-button-group.jsx");
var PropCheckBox = require("../components/prop-check-box.jsx");
var NumberInput = require("../components/number-input.jsx");
var TextInput = require("../components/text-input.jsx");

var ApiClassNames   = require("../perseus-api.jsx").ClassNames;
var ApiOptions      = require("../perseus-api.jsx").Options;
var EnabledFeatures = require("../enabled-features.jsx");

var Editor = require("../editor.jsx");

var answerFormButtons = [
    {title: "Exact Match", value: "exact_match", content: "exact text"},
    {title: "Free Response", value: "free_response", content: "Any text at all"}
];

var formExamples = {
    "exact_match": () => $._("a few words"),
    "free_response": () => $._("your answer will be saved but not graded")
};

var FreeTextInput = React.createClass({
    propTypes: {
        currentValue: React.PropTypes.string,
        enabledFeatures: EnabledFeatures.propTypes,
        apiOptions: ApiOptions.propTypes,
        coefficient: React.PropTypes.bool,
        answerForms: React.PropTypes.arrayOf(React.PropTypes.shape({
            name: React.PropTypes.string.isRequired
        })),
        labelText: React.PropTypes.string,
        reviewModeRubric: React.PropTypes.object,
    },

    getDefaultProps: function() {
        return {
            currentValue: "",
            enabledFeatures: EnabledFeatures.defaults,
            apiOptions: ApiOptions.defaults,
            coefficient: false,
            answerForms: [],
            labelText: ""
        };
    },

    render: function() {

        var rubric = this.props.reviewModeRubric;
        if (rubric) {
            var score = this.simpleValidate(rubric);
            var correct = score.type === "points" &&
                          score.earned === score.total;

            var answerBlurb = null;
            if (!correct) {
                var correctAnswers = _.filter(
                    rubric.answers, (answer) => answer.status === "correct");
                var answerComponents = _.map(correctAnswers, (answer, key) => {
                    // Figure out how this answer is supposed to be displayed
                    if (answer.answerForms && answer.answerForms[0]) {
                        // NOTE(johnsullivan): This isn't exactly ideal, but
                        // it does behave well for all the currently known
                        // problems. See D14742 for some discussion on
                        // alternate strategies.
                        format = answer.answerForms[0]
                    }

                    var answerString = answer.value;
                    return <span key={key} className="perseus-possible-answer">
                        {answerString}
                    </span>
                });
                answerBlurb = <span className="perseus-possible-answers">
                    {answerComponents}
                </span>;
            }
        }

        var classes = {};
        classes[ApiClassNames.CORRECT] =
            rubric && correct && this.props.currentValue;
        classes[ApiClassNames.INCORRECT] =
            rubric && !correct && this.props.currentValue;
        classes[ApiClassNames.UNANSWERED] = rubric && !this.props.currentValue;

        var input = <TextArea
            ref="input"
            value={this.props.currentValue}
            rows={this.props.rows}
            cols={this.props.cols}
            onChange={this.handleChange}
            className={classNames(classes)}
            type={this._getInputType()}
            examples={this.examples()}
            shouldShowExamples={this.shouldShowExamples()}
            onFocus={this._handleFocus}
            onBlur={this._handleBlur} />;

        var inputWithLabel;
        if (this.props.labelText) {
            inputWithLabel = <label>
                <span className="perseus-sr-only">{this.props.labelText}</span>
                {input}
            </label>;
        } else {
            inputWithLabel = input;
        }

        if (answerBlurb) {
            return <span className="perseus-input-with-answer-blurb">
                {inputWithLabel}
                {answerBlurb}
            </span>;
        } else {
            return inputWithLabel;
        }
    },

    handleChange: function(newValue) {
        // TODO(johnsullivan): It would be better to support this lower down so
        // that the input element actually gets marked with the disabled
        // attribute. Because of how many layers of widgets are below us
        // though, and because we're using CSS to disable click events (only
        // unsupported on IE 10), I'm calling this sufficient for now.
        if (!this.props.apiOptions.readOnly) {
            this.props.onChange({ currentValue: newValue });
        }
    },

    _getInputType: function() {
        return "text";
    },

    _handleFocus: function() {
        this.props.onFocus([]);
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
        return "expression";
    },

    setInputValue: function(path, newValue, cb) {
        this.props.onChange({
            currentValue: newValue
        }, cb);
    },

    getUserInput: function() {
        return {currentValue: this.props.currentValue};
    },

    simpleValidate: function(rubric) {
        return FreeTextInput.validate(this.getUserInput(), rubric);
    },

    shouldShowExamples: function() {
        var noFormsAccepted = this.props.answerForms.length === 0;
        var allFormsAccepted = this.props.answerForms.length >=
                _.size(formExamples);
        return this.props.enabledFeatures.toolTipFormats &&
                !noFormsAccepted && !allFormsAccepted;
    },

    examples: function() {
        // if the set of specified forms are empty, allow all forms
        var forms = this.props.answerForms.length !== 0 ?
                        this.props.answerForms :
                        _.map(_.keys(formExamples), (name) => {
                            return {
                                name: name
                            };
                        });

        return _.map(forms, (form) => {
            return formExamples[form.name](form);
        });
    }
});

_.extend(FreeTextInput, {
    validate: function(state, rubric) {
        var allAnswerForms = _.pluck(answerFormButtons, "value");

        var createValidator = (answer) =>
            Khan.answerTypes.text.createValidatorFunctional(
                answer.value, {
                    message: answer.message,
                    maxError: answer.maxError,
                    forms: (answer.strict && answer.answerForms 
                            && answer.answerForms.length !== 0) ?
                            answer.answerForms : allAnswerForms
            });

        var currentValue = state.currentValue;

        // (rtibbles) Big fat hack to always return response as 'correct'.
        var correctAnswers = _.where(rubric.answers, {status: "correct"});
        var result = {};

        if (!result) { // Otherwise, if the guess is not correct
            var otherAnswers = ([]).concat(
                _.where(rubric.answers, {status: "ungraded"}),
                _.where(rubric.answers, {status: "wrong"})
            );

            // Look through all other answers and if one matches either
            // precisely or approximately return the answer's message
            match = _.find(otherAnswers, (answer) => {
                 var validate = createValidator(answer);
                 return validate(currentValue).correct;
             });
            result = {
                empty: match ? match.status === "ungraded" : false,
                correct: match ? match.status === "correct" : false,
                message: match ? match.message : null,
                guess: currentValue
            };
        }

        // TODO(eater): Seems silly to translate result to this invalid/points
        // thing and immediately translate it back in ItemRenderer.scoreInput()
        if (result.empty) {
            return {
                type: "invalid",
                message: result.message
            };
        } else {
            return {
                type: "points",
                earned: result.correct ? 1 : 0,
                total: 0,
                message: result.message
            };
        }
    }
});

var initAnswer = (status) => {
    return {
        value: null,
        status: status,
        message: "",
        answerForms: [],
        strict: false,
        maxError: null
    };
};

var FreeTextInputEditor = React.createClass({
    mixins: [EditorJsonify, Changeable],

    getDefaultProps: function() {
        return {
            answers: [initAnswer("ungraded")],
            cols: 50,
            rows: 10,
            coefficient: false,
            labelText: "",
        };
    },

    getInitialState: function() {
        return {
            lastStatus: "wrong",
            showOptions: _.map(this.props.answers, () => false)
        };
    },

    render: function() {
        var lastStatus = this.state.lastStatus; // for a phantom last answer
        var answers = this.props.answers;

        var inputColumns = <div className="perseus-widget-row">
                <label>Width:{' '} </label>
                <NumberInput
                value={this.props.cols}
                checkValidity={val => _.isNumber(val)}
                onChange={this.change("cols")} />
                <InfoTip>
                    <p>The number of columns (in characters)
                    that the input area will have displayed.</p>
                </InfoTip>
            </div>;

        var inputRows = <div className="perseus-widget-row">
                <label>Height:{' '} </label>
                <NumberInput
                value={this.props.rows}
                checkValidity={val => _.isNumber(val)}
                onChange={this.change("rows")} />
                <InfoTip>
                    <p>The number of lines that the input
                    area will have displayed.</p>
                </InfoTip>
            </div>;

        var labelText = <div className="perseus-widget-row">
                <label>
                    Label text:{' '}
                    <TextInput
                        value={this.props.labelText}
                        onChange={this.change("labelText")} />
                </label>
                <InfoTip>
                    <p>Text to describe this input. This will be shown to users
                    using screenreaders.</p>
                </InfoTip>
            </div>;

        var coefficientCheck = <div>
            <div className="perseus-widget-row">
                <PropCheckBox label="Coefficient"
                    coefficient={this.props.coefficient}
                    onChange={this.props.onChange} />
                <InfoTip>
                    <p>A coefficient style number allows the student to use - for -1 and an empty string to mean 1.</p>
                </InfoTip>
            </div>
        </div>;

        var addAnswerButton = <div>
            <a
                href="javascript:void(0)"
                className="simple-button orange"
                onClick={() => this.addAnswer()}
                onKeyDown={(e) => this.onSpace(e, this.addAnswer)}>
              <span>Add new answer</span>
            </a>
        </div>;

        var instructions = {
            "wrong":    "(address the mistake/misconception)",
            "ungraded": "(explain in detail to avoid confusion)",
            "correct":  "(reinforce the user's understanding)"
        };

        var generateInputAnswerEditors = () => answers.map((answer, i) => {
            var editor = <Editor
                content={answer.message || ""}
                placeholder={"Why is this answer " + answer.status + "?\t" +
                    instructions[answer.status]}
                widgetEnabled={false}
                onChange={(newProps) => {
                    if ("content" in newProps) {
                        this.updateAnswer(i, {message: newProps.content});
                    }
                }} />;
            return <div className="perseus-widget-row" key={i}>
                <div className={"input-answer-editor-value-container" +
                    (answer.maxError ? " with-max-error" : "")}>
                    <TextArea value={answer.value}
                        className="free-text-input-value"
                        placeholder="answer"
                        onChange={(newValue) => {
                            this.updateAnswer(i, {
                                value: newValue});
                        }} />
                    {answer.maxError ? <div className="max-error-container">
                        <div className="max-error-plusmn">&plusmn;</div>
                        <TextArea placeholder={0}
                            value={answers[i]["maxError"]}
                            format={_.last(answer.answerForms)}
                            onChange={this.updateAnswer(i, "maxError")} />
                    </div> : null}
                    <div className="value-divider" />
                    <a href="javascript:void(0)"
                        className={"answer-status " + answer.status}
                        onClick={() => this.onStatusChange(i)}
                        onKeyDown={(e) => this.onSpace(e, this.onStatusChange, i)}>
                        {answer.status}
                    </a>
                    <a
                        href="javascript:void(0)"
                        className="answer-trash"
                        onClick={() => this.onTrashAnswer(i)}
                        onKeyDown={(e) => this.onSpace(e, this.onTrashAnswer, i)}>
                      <span className="icon-trash" />
                    </a>
                    <a href="javascript:void(0)"
                        className="options-toggle"
                        onClick={() => this.onToggleOptions(i)}
                        onKeyDown={(e) => this.onSpace(e, this.onToggleOptions, i)}>
                      <i className="icon-gear" />
                    </a>
                </div>
                <div className="input-answer-editor-message">{editor}</div>
                {this.state.showOptions[i] &&
                    <div className="options-container">
                        {maxError(i)}
                        {answer.status === "correct" && unsimplifiedAnswers(i)}
                        {suggestedAnswerTypes(i)}
                    </div>}
            </div>;
        });

        return <div className="perseus-input-text-editor">
            <div className="ui-title">User input</div>
            <div className="msg-title">Message shown to user on attempt</div>
            {generateInputAnswerEditors()}
            {addAnswerButton}
            {inputColumns}
            {inputRows}
            {labelText}
        </div>;

    },

    onToggleOptions: function(choiceIndex) {
        var showOptions = this.state.showOptions.slice();
        showOptions[choiceIndex] = !showOptions[choiceIndex];
        this.setState({showOptions: showOptions});
    },

    onTrashAnswer: function(choiceIndex) {
        if (choiceIndex >= 0 && choiceIndex < this.props.answers.length) {
            var answers = this.props.answers.slice(0);
            answers.splice(choiceIndex, 1);
            this.props.onChange({answers: answers});
        }
    },

    onSpace: function(e, callback) {
        if (e.key === " ") {
            e.preventDefault(); // prevent page shifting
            var args = _.toArray(arguments).slice(2);
            callback.apply(this, args);
        }
    },

    onStatusChange: function(choiceIndex) {
        var statuses = ["wrong", "ungraded", "correct"];
        var answers = this.props.answers;
        var i = _.indexOf(statuses, answers[choiceIndex].status);
        var newStatus = statuses[(i + 1) % statuses.length];

        this.updateAnswer(choiceIndex, {
            status: newStatus
        });
    },

    updateAnswer: function(choiceIndex, update) {
        if (!_.isObject(update)) {
            return _.partial((choiceIndex, key, value) => {
                var update = {};
                update[key] = value;
                this.updateAnswer(choiceIndex, update);
            }, choiceIndex, update);
        }

        var answers = _.clone(this.props.answers);

        // Don't bother to make a new answer box unless we are editing the last one
        // TODO(michelle): This might not be necessary anymore.
        if (choiceIndex == answers.length) {
            var lastAnswer = initAnswer(this.state.lastStatus);
            var answers = answers.concat(lastAnswer);
        }

        answers[choiceIndex] = _.extend({}, answers[choiceIndex], update);
        this.props.onChange({answers: answers});
    },

    addAnswer: function() {
        var lastAnswer = initAnswer(this.state.lastStatus);
        var answers = this.props.answers.concat(lastAnswer);
        this.props.onChange({answers: answers});
    },

    getSaveWarnings: function() {
        // Filter out all the empty answers
        var warnings = [];
        // TODO(emily): This doesn't actually work, because the value is either
        // null or undefined when undefined, probably.
        if (_.contains(_.pluck(this.props.answers, "value"), "")) {
            warnings.push("One or more answers is empty");
        }
        if (this.props.labelText === "") {
            warnings.push("No label is specified");
        }
        this.props.answers.forEach((answer, i) => {
            if (answer.strict && (!answer.answerForms || answer.answerForms.length === 0)) {
                warnings.push("Answer " + (i + 1) + " is set to strict format matching, but no format was selected");
            }
        });
        return warnings;
    },
});

var unionAnswerForms = function(answerFormsList) {
    // Takes a list of lists of answer forms, and returns a list of the forms
    // in each of these lists in the same order that they're listed in the
    // `formExamples` forms from above.

    // uniqueBy takes a list of elements and a function which compares whether
    // two elements are equal, and returns a list of unique elements. This is
    // just a helper function here, but works generally.
    var uniqueBy = function(list, iteratee) {
        return _.reduce(list, (uniqueList, element) => {
            // For each element, decide whether it's already in the list of
            // unique items.
            var inList = _.find(uniqueList, iteratee.bind(null, element));
            if (inList) {
                return uniqueList;
            } else {
                return uniqueList.concat([element]);
            }
        }, []);
    };

    // Pull out all of the forms from the different lists.
    var allForms = _.flatten(answerFormsList);
    // Pull out the unique forms using uniqueBy.
    var uniqueForms = uniqueBy(allForms, _.isEqual);
    // Sort them by the order they appear in the `formExamples` list.
    return _.sortBy(uniqueForms, (form) => {
        return _.keys(formExamples).indexOf(form.name);
    });
};

var propsTransform = function(editorProps) {
    var rendererProps = _.extend(
        _.omit(editorProps, "answers"),
        {
            answerForms: unionAnswerForms(
                // Pull out the name of each form and whether that form has
                // required simplification.
                _.map(editorProps.answers, (answer) => {
                    return _.map(answer.answerForms, (form) => {
                        return {
                            name: form
                        };
                    });
                })
            )
        }
    );
    return rendererProps;
};

module.exports = {
    name: "free-text-input",
    displayName: "Free response text box",
    defaultAlignment: "inline-block",
    accessible: true,
    widget: FreeTextInput,
    editor: FreeTextInputEditor,
    transform: propsTransform
};
