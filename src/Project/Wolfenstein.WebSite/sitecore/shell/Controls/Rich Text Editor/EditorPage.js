if (typeof (Sitecore) == "undefined") Sitecore = new Object();
if (typeof (Sitecore.Controls) == "undefined") Sitecore.Controls = new Object();

Sitecore.Controls.RichEditor = Class.create({  
    initialize: function (editorId) {
        this.editorId = editorId;
        this.elementTriggered = null;
    },

    onClientLoad: function (editor) {
        editor.attachEventHandler("onkeydown", this.onKeyDown.bind(this));
        editor.attachEventHandler("onkeyup", this.handleKeyPress.bind(this));
        if (!scForm.browser.isIE) {
            this.getEditor().get_element().style.minHeight = '';
        }

        this.setText('<div class="autocomplete">' +
            '<span class="autocomplete-title">Predictive Search</span>' +
            '<ul class="autocomplete-list"></ul>' +
            '</div>' +
            '<div class="loader"></div>');
        console.log("Loaded basic data");

        fixIeObjectTagBug();

        // get the design mode
        var designModeBtn = $$('.reMode_design')[0];
        if (typeof (designModeBtn) != "undefined") {
            Event.observe(designModeBtn, 'click', function () {
                setTimeout(fixIeObjectTagBug, 100);
            });
        }

        if (Prototype.Browser.IE && editor.get_newLineMode() == Telerik.Web.UI.EditorNewLineModes.P) {
            editor.attachEventHandler("onkeydown", function (e) {
                if (e.keyCode == 13) {
                    var oCmd = new Telerik.Web.UI.Editor.GenericCommand("Enter", editor.get_contentWindow(), editor);
                    editor.executeCommand(oCmd);
                }
            });
        }

        this.oldValue = editor.get_html(true);
    },

    getEditor: function () {
        if (typeof ($find) == "function") {
            return $find(this.editorId);
        }

        return null;
    },

    saveRichText: function (html) {
        var w = scForm.browser.getParentWindow(window.frameElement.ownerDocument);
        if (w.frameElement) {
            w = scForm.browser.getParentWindow(w.frameElement.ownerDocument);
        }

        w.scContent.saveRichText(html);
    },

    setFocus: function () {
        var editor = this.getEditor();
        if (!editor) {
            return;
        }

        editor.setFocus();
    },

    setText: function (html) {
        var editor = this.getEditor();
        if (!editor) {
            return;
        }

        editor.set_html(html);
        fixIeObjectTagBug();
    },

    onKeyDown: function (evt) {
        var editor = this.getEditor();

        if (editor == null || evt == null) {
            return;
        }

        if (evt.ctrlKey && evt.keyCode == 13) {
            scSendRequest("editorpage:accept");
            return;
        }

        if (!scForm.isFunctionKey(evt, true)) {
            scForm.setModified(true);
        }
    },

    handleKeyPress: function (event) {
        var editor = this.getEditor();
        var loader = editor.get_document().querySelector(".loader");

        if (editor == null || event == null) {
            return;
        }

        if (event.keyCode == 32 && event.shiftKey) {
            console.log("event handled");
            var range = document.createRange(),
                x = null,
                y = null;
            const isSupported = typeof window.getSelection !== "undefined";
            if (isSupported) {
                const selection = window.getSelection();
                if (selection.rangeCount !== 0) {
                    var range = selection.getRangeAt(0);
                    var rect = range.getClientRects()[0];
                    if (rect) {
                        x = rect.left;
                        y = rect.top + 5;                       
                        loader.setAttribute("style", `top:${y}px; left:${x}px`);
                        loader.classList.add("active");
                    }
                }
            }
            this.getPredictiveSearch(event.currentTarget, loader);
        }
    },

    getPredictiveSearch: function (element, loader) {
        var data = {};
        data.text = element.body.innerText.trim();
        data.length = 1;
        data.sequences = 5;
        const url = "https://8ee8a6d2bcc6.ngrok.io/api/generate-text";
        this.elementTriggered = element;

        axios
            .post(url, data, {
                responseType: "json",
            })
            .then(function (res) {
                if (res.data.generatedTexts.length) {
                    loader.classList.remove("active");
                    renderResponse(res.data.generatedTexts);
                }
            })
            .catch(function (error) {
                loader.classList.remove("active");
                console.log(error);
            });
    },

    renderResponse: function (data) {
        var range = document.createRange(),
            x = null,
            y = null;

        const autocomplete = document.querySelector(".autocomplete");
        const autocompleteList = document.querySelector(".autocomplete-list");
        const isSupported = typeof window.getSelection !== "undefined";
        var options = "";

        data.forEach((element, index) => {
            options += `<li class="${index === 0 ? "item active" : "item"
                }" data.element="${element.generated_text}">${element.generated_text
                }</li>`;
        });

        autocompleteList.innerHTML = options;

        if (isSupported) {
            const selection = window.getSelection();
            if (selection.rangeCount !== 0) {
                var range = selection.getRangeAt(0);
                var rect = range.getClientRects()[0];
                if (rect) {
                    x = rect.left;
                    y = rect.top + 5;
                    autocomplete.setAttribute("style", `top:${y}px; left:${x}px`);
                    autocomplete.classList.add("active");

                    document.addEventListener("keydown", handleSelection);
                    document.addEventListener("click", handleClick);
                }
            }
        }
    },

    handleClick: function (event) {
        event.preventDefault();
        focusElement();
    },

    handleSelection: function (event) {
        event.preventDefault();
        const autocomplete = document.querySelector(".autocomplete");
        const actual = document.querySelector(
            ".autocomplete-list .item.active"
        );
        const nodes = document.querySelectorAll(".autocomplete-list .item");
        if (event.keyCode === 38) {
            const prev = actual.previousSibling;
            actual.classList.remove("active");
            if (prev) {
                prev.classList.add("active");
            } else {
                nodes[nodes.length - 1].classList.add("active");
            }
        } else if (event.keyCode === 40) {
            const next = actual.nextSibling;
            actual.classList.remove("active");
            if (next) {
                next.classList.add("active");
            } else {
                nodes[0].classList.add("active");
            }
        } else if (event.keyCode === 13) {
            const content = `${document
                .querySelector(".autocomplete .item.active")
                .getAttribute("data.element")}`;
            elementTriggered.innerText = content;
            focusElement();
        } else {
            focusElement();
        }
    },

    focusElement: function () {
        const autocomplete = document.querySelector(".autocomplete");
        autocomplete.classList.remove("active");
        document.removeEventListener("keydown", handleSelection);
        document.removeEventListener("click", handleClick);
        elementTriggered.focus();
        var range = document.createRange();
        range.selectNodeContents(elementTriggered);
        range.collapse(false);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }
});

function scCloseEditor() {
    var doc = window.top.document;

    // Field editor
    var w = doc.getElementById('feRTEContainer');

    if (w) {
        $(w).hide();
    }
    else {
        // Page editor
        if (top._scDialogs.length != 0) {
            top.dialogClose();
        } else {
            scCloseRadWindow();
        }
    }
}

function scGetRadWindow() {
    var currentRadWindow = null;
    if (window.radWindow)
        currentRadWindow = window.radWindow;
    else if (window.frameElement.radWindow)
        currentRadWindow = window.frameElement.radWindow;
    return currentRadWindow;
}

function scCloseRadWindow() {
    var currentRadWindow = scGetRadWindow();
    if (currentRadWindow != null) {
        // Hack for IE. Window is not closed because code thinks that window is already closed. Calling 'show' before closing helps to solve the problem. 
        currentRadWindow.show();
        currentRadWindow.close();
    }
    return false;
}