define([
    "mvc/dataset/states",
    "mvc/base-mvc",
    "utils/localization"
], function( STATES, BASE_MVC, _l ){
//==============================================================================
var searchableMixin = BASE_MVC.SearchableModelMixin;
/** @class base model for any DatasetAssociation (HDAs, LDDAs, DatasetCollectionDAs).
 *      No knowledge of what type (HDA/LDDA/DCDA) should be needed here.
 *  The DA's are made searchable (by attribute) by mixing in SearchableModelMixin.
 */
var DatasetAssociation = Backbone.Model.extend( BASE_MVC.LoggableMixin ).extend(
        BASE_MVC.mixin( searchableMixin, {

    /** default attributes for a model */
    defaults : {
        state               : STATES.NEW,
        deleted             : false,
        purged              : false,

        // unreliable attribute
        name                : '(unnamed dataset)',

//TODO: update to false when this is correctly passed from the API (when we have a security model for this)
        accessible          : true,

        // sniffed datatype (sam, tabular, bed, etc.)
        data_type           : '',
        file_ext            : '',

        // size in bytes
        file_size           : 0,

        // array of associated file types (eg. [ 'bam_index', ... ])
        meta_files          : [],

        misc_blurb          : '',
        misc_info           : '',

        tags                : []
        // do NOT default on annotation, as this default is valid and will be passed on 'save'
        //  which is incorrect behavior when the model is only partially fetched (annos are not passed in summary data)
        //annotation          : ''
    },

    initialize : function( attrs, options ){
        this.debug( 'Dataset.initialize', attrs, options );
        //!! this state is not in trans.app.model.Dataset.states - set it here -
        if( !this.get( 'accessible' ) ){
            this.set( 'state', STATES.NOT_VIEWABLE );
        }

        /** Datasets rely/use some web controllers - have the model generate those URLs on startup */
        this.urls = this._generateUrls();

        this._setUpListeners();
    },
    
    /** returns misc. web urls for rendering things like re-run, display, etc. */
    _generateUrls : function(){
//TODO: would be nice if the API did this
        var id = this.get( 'id' );
        if( !id ){ return {}; }
        var urls = {
//TODO: how many of these are still used?
            'purge'         : 'datasets/' + id + '/purge_async',
            'display'       : 'datasets/' + id + '/display/?preview=True',
            'edit'          : 'datasets/' + id + '/edit',
            'download'      : 'datasets/' + id + '/display?to_ext=' + this.get( 'file_ext' ),
            'report_error'  : 'dataset/errors?id=' + id,
            'rerun'         : 'tool_runner/rerun?id=' + id,
            'show_params'   : 'datasets/' + id + '/show_params',
            'visualization' : 'visualization',
            'meta_download' : 'dataset/get_metadata_file?hda_id=' + id + '&metadata_name='
        };
//TODO: global
        var root = ( galaxy_config && galaxy_config.root )?( galaxy_config.root ):( '/' );
        _.each( urls, function( value, key ){
            urls[ key ] = root + value;
        });
        this.urls = urls;
        return urls;
    },

    /** set up any event listeners
     *  event: state:ready  fired when this DA moves into/is already in a ready state
     */
    _setUpListeners : function(){
        // if the state has changed and the new state is a ready state, fire an event
        this.on( 'change:state', function( currModel, newState ){
            this.log( this + ' has changed state:', currModel, newState );
            if( this.inReadyState() ){
                this.trigger( 'state:ready', currModel, newState, this.previous( 'state' ) );
            }
        });
        // the download url (currenlty) relies on having a correct file extension
        this.on( 'change:id change:file_ext', function( currModel ){
            this._generateUrls();
        });
    },

    // ........................................................................ common queries
    /** override to add urls */
    toJSON : function(){
        var json = Backbone.Model.prototype.toJSON.call( this );
        return _.extend( json, {
            urls : this.urls
        });
    },

    /** Is this dataset deleted or purged? */
    isDeletedOrPurged : function(){
        return ( this.get( 'deleted' ) || this.get( 'purged' ) );
    },

    /** Is this dataset in a 'ready' state; where 'Ready' states are states where no
     *      processing (for the ds) is left to do on the server.
     */
    inReadyState : function(){
        var ready = _.contains( STATES.READY_STATES, this.get( 'state' ) );
        return ( this.isDeletedOrPurged() || ready );
    },

    /** Does this model already contain detailed data (as opposed to just summary level data)? */
    hasDetails : function(){
        //?? this may not be reliable
        return _.has( this.attributes, 'genome_build' );
    },

    /** Convenience function to match dataset.has_data. */
    hasData : function(){
        return ( this.get( 'file_size' ) > 0 );
    },

    // ........................................................................ ajax
    //NOTE: subclasses of DA's will need to implement url and urlRoot in order to have these work properly

    /** save this dataset, _Mark_ing it as deleted (just a flag) */
    'delete' : function( options ){
        if( this.get( 'deleted' ) ){ return jQuery.when(); }
        return this.save( { deleted: true }, options );
    },
    /** save this dataset, _Mark_ing it as undeleted */
    undelete : function( options ){
        if( !this.get( 'deleted' ) || this.get( 'purged' ) ){ return jQuery.when(); }
        return this.save( { deleted: false }, options );
    },

    purge : function _purge( options ){
//TODO: use, override model.destroy, HDA.delete({ purge: true })
        if( this.get( 'purged' ) ){ return jQuery.when(); }
        options = options || {};
        //var hda = this,
        //    //xhr = jQuery.ajax( this.url() + '?' + jQuery.param({ purge: true }), _.extend({
        //    xhr = jQuery.ajax( this.url(), _.extend({
        //        type : 'DELETE',
        //        data : {
        //            purge : true
        //        }
        //    }, options ));
        //
        //xhr.done( function( response ){
        //    console.debug( 'response', response );
        //    //hda.set({ deleted: true, purged: true });
        //    hda.set( response );
        //});
        //return xhr;

        options.url = this.urls.purge;

        //TODO: ideally this would be a DELETE call to the api
        //  using purge async for now
        var hda = this,
            xhr = jQuery.ajax( options );
        xhr.done( function( message, status, responseObj ){
            hda.set({ deleted: true, purged: true });
        });
        xhr.fail( function( xhr, status, message ){
            // Exception messages are hidden within error page including:  '...not allowed in this Galaxy instance.'
            // unbury and re-add to xhr
            var error = _l( "Unable to purge dataset" );
            var messageBuriedInUnfortunatelyFormattedError = ( 'Removal of datasets by users '
                + 'is not allowed in this Galaxy instance' );
            if( xhr.responseJSON && xhr.responseJSON.error ){
                error = xhr.responseJSON.error;
            } else if( xhr.responseText.indexOf( messageBuriedInUnfortunatelyFormattedError ) !== -1 ){
                error = messageBuriedInUnfortunatelyFormattedError;
            }
            xhr.responseText = error;
            hda.trigger( 'error', hda, xhr, options, _l( error ), { error: error } );
        });
        return xhr;
    },

    // ........................................................................ searching
    // see base-mvc, SearchableModelMixin

    /** what attributes of an HDA will be used in a text search */
    searchAttributes : [
        'name', 'file_ext', 'genome_build', 'misc_blurb', 'misc_info', 'annotation', 'tags'
    ],

    /** our attr keys don't often match the labels we display to the user - so, when using
     *      attribute specifiers ('name="bler"') in a term, allow passing in aliases for the
     *      following attr keys.
     */
    searchAliases : {
        title       : 'name',
        format      : 'file_ext',
        database    : 'genome_build',
        blurb       : 'misc_blurb',
        description : 'misc_blurb',
        info        : 'misc_info',
        tag         : 'tags'
    },

    // ........................................................................ misc
    /** String representation */
    toString : function(){
        var nameAndId = this.get( 'id' ) || '';
        if( this.get( 'name' ) ){
            nameAndId = '"' + this.get( 'name' ) + '",' + nameAndId;
        }
        return 'Dataset(' + nameAndId + ')';
    }
}));


//==============================================================================
    return {
        DatasetAssociation : DatasetAssociation
    };
});