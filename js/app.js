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
            currentTask: -1,
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
            allDone: {
                get: function() {
                    return this.remaining === 0;
                },
                set: function( value ) {
                    this.todos.forEach( function( todo ) {
                        todo.completed = value;
                    } );
                }
            },

            nextTasklessDay: function() {
                return Math.round( 1 / this.tasklessProbability );
            },

            remaining: function() {
                return filters.active( this.todos ).length;
            },

            tasklessProbability: function() {
                var prob = 1;

                this.todos.forEach( function( todo ) {
                    prob *= 1 - ( todo.dividend + todo.skips ) / ( todo.divisor + todo.skips );
                });

                return prob;
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

                // Add the new item to the end of all other items in the same
                // category. We assume all items are grouped together.
                for( var i = 0; i < this.todos.length; ++i ) {
                    if( this.todos[i].category === this.newCategory && this.todos[ i + 1 ] && this.todos[ i + 1 ].category !== this.newCategory ) {
                        break;
                    }
                }

                this.todos.splice( i + 1, 0, {
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

            categoryProbability: function( category ) {
                var prob = 1;

                this.todos.slice( this.currentTask + 1 ).filter( (todo) => todo.category === category )
                    .forEach( function( todo ) {
                        prob *= 1 - ( todo.dividend + todo.skips ) / ( todo.divisor + todo.skips );
                    });

                return 1 - prob;
            },

            clearSkips: function() {
                for( var i = 0; i < this.todos.length; ++i ) {
                    this.todos[ i ].skips = 0;
                }
            },

            cumulativeCategoryProbability: function( category ) {
                var index = this.categories.indexOf( category );
                var prob = 1;
                var categoryProbability = this.categoryProbability;

                this.categories.slice( 0, index ).forEach( function( category ) {
                    prob *= 1 - categoryProbability( category );
                });

                prob *= categoryProbability( category );

                return prob;
            },

            cumulativeProbability: function( index ) {
                var prob = 1,
                    todo = this.todos[ index ];

                this.todos.slice( this.currentTask + 1, index ).forEach( function( todo ) {
                    prob *= 1 - ( todo.dividend + todo.skips ) / ( todo.divisor + todo.skips );
                });

                prob *= ( todo.dividend + todo.skips ) / ( todo.divisor + todo.skips );

                return prob;
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

            roundToPrecision: function( a ) {
                var n = 1;

                if( a >= 1 || a <= 0 ) {
                    return Math.round( a );
                }

                while( a.toFixed( n ).slice( -1 ) === "0" && n < 5 ) {
                    n++;
                }

                return a.toFixed( n );
            },

            removeCompleted: function() {
                this.todos = filters.active( this.todos );
            },

            removeTodo: function( todo ) {
                var index = this.todos.indexOf( todo );
                this.todos.splice( index, 1 );
            },

            runFrom: function( index ) {
                var todo,
                    rnd,
                    selected = false,
                    oldSelected = document.querySelectorAll( '.selected' );

                if( oldSelected ) {
                    oldSelected.forEach( function( old ) {
                        old.classList.add( 'old' );
                    } );
                }

                for( var i = index; i < this.todos.length; ++i ) {
                    todo = this.todos[ i ];
                    rnd = Math.random() * ( todo.divisor + ( todo.skips || 0 ) );

                    if( rnd < todo.dividend + ( todo.skips || 0 ) ) {
                        todo.selected = true;
                        todo.skips = 0;
                        selected = true;
                        this.currentTask = i;
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