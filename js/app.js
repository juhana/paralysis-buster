/*global Vue, todoStorage */

(function( exports ) {

    'use strict';

    var filters = {
        all: function( todos ) {
            return todos;
        },
        active: function( todos ) {
            return todos.filter( function( todo ) {
                return !todo.completed;
            } );
        },
        completed: function( todos ) {
            return todos.filter( function( todo ) {
                return todo.completed;
            } );
        }
    };

    exports.app = new Vue( {

        // the root element that will be compiled
        el: '.todoapp',

        // app initial state
        data: {
            todos: todoStorage.fetch(),
            newTodo: '',
            newDividend: 1,
            newDivisor: 7,
            editedTodo: null,
            visibility: 'all',
            notasks: false,
            showImport: false,
            importData: "",
            categories: [ "Work", "IF", "Home", "One-shot" ],
            newCategory: "One-shot"

        },

        // watch todos change for localStorage persistence
        watch: {
            todos: {
                deep: true,
                handler: todoStorage.save
            }
        },

        // computed properties
        // http://vuejs.org/guide/computed.html
        computed: {
            remaining: function() {
                return filters.active( this.todos ).length;
            },
            allDone: {
                get: function() {
                    return this.remaining === 0;
                },
                set: function( value ) {
                    this.todos.forEach( function( todo ) {
                        todo.completed = value;
                    } );
                }
            }
        },

        // methods that implement data logic.
        // note there's no DOM manipulation here at all.
        methods: {
            addTodo: function() {
                var value = this.newTodo && this.newTodo.trim();
                if( !value ) {
                    return;
                }

                if( this.newDividend < 1 || this.newDividend >= this.newDivisor ) {
                    return;
                }

                this.todos.push( {
                    title: value,
                    category: this.newCategory,
                    dividend: this.newDividend,
                    divisor: this.newDivisor,
                    completed: false,
                    skips: 0
                } );

                this.newTodo = '';

                $( '#newTodoName' ).focus();
            },

            cancelEdit: function( todo ) {
                this.editedTodo = null;
                todo.title = this.beforeEditCache;
            },

            doneEdit: function( todo ) {
                if( !this.editedTodo ) {
                    return;
                }
                this.editedTodo = null;
                todo.title = todo.title.trim();
                if( !todo.title ) {
                    this.removeTodo( todo );
                }
                todoStorage.save( this.todos );
            },

            editTodo: function( todo ) {
                this.beforeEditCache = todo.title;
                this.editedTodo = todo;
            },

            clearSkips: function() {
                for( var i = 0; i < this.todos.length; ++i ) {
                    this.todos[ i ].skips = 0;
                }
            },

            exportTodos: function() {
                var blob = new Blob(
                    [ JSON.stringify( this.todos ) ],
                    {type: "text/plain;charset=utf-8;"}
                    ),

                    elem = window.document.createElement( 'a' ),
                    today = new Date();

                elem.href = window.URL.createObjectURL( blob );
                elem.download = "todos-" + today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + ".txt";
                document.body.appendChild( elem );
                elem.click();
                document.body.removeChild( elem );
            },

            gcd: function gcd( a, b ) {
                if( !b ) {
                    return a;
                }

                return gcd( b, a % b );
            },

            importTodos: function() {
                this.todos = JSON.parse( this.importData );
                this.showImport = false;
                this.$forceUpdate();
            },

            removeCompleted: function() {
                this.todos = filters.active( this.todos );
            },

            removeTodo: function( todo ) {
                var index = this.todos.indexOf( todo );
                this.todos.splice( index, 1 );
            },

            runFrom: function( index ) {
                var todo, rnd, selected = false;

                for( var i = index; i < this.todos.length; ++i ) {
                    todo = this.todos[ i ];
                    rnd = Math.random() * ( todo.divisor + ( todo.skips || 0 ) );

                    if( rnd < todo.dividend + ( todo.skips || 0 ) ) {
                        todo.selected = true;
                        todo.skips = 0;
                        selected = true;
                        break;
                    }
                    else {
                        todo.skipped = true;
                        todo.skips = todo.skips ? (todo.skips + 1) : 1;
                    }
                }

                if( !selected ) {
                    this.notasks = true;
                }

                this.$forceUpdate();
            }
        },

        // a custom directive to wait for the DOM to be updated
        // before focusing on the input field.
        // http://vuejs.org/guide/custom-directive.html
        directives: {
            'todo-focus': function( el, binding ) {
                if( binding.value ) {
                    el.focus();
                }
            }
        }
    } );

})( window );