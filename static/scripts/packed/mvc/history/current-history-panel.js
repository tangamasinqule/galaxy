define(["mvc/dataset/hda-edit","mvc/history/history-panel","mvc/collection/collection-panel","mvc/base-mvc","utils/localization"],function(c,f,a,h,b){var d=h.SessionStorageModel.extend({defaults:{searching:false,tagsEditorShown:false,annotationEditorShown:false},toString:function(){return"HistoryPanelPrefs("+JSON.stringify(this.toJSON())+")"}});d.storageKey=function e(){return("history-panel")};var g=f.HistoryPanel;var i=g.extend({HDAViewClass:c.HDAEditView,emptyMsg:b("This history is empty. Click 'Get Data' on the left tool menu to start"),noneFoundMsg:b("No matching datasets found"),initialize:function(j){j=j||{};this.preferences=new d(_.extend({id:d.storageKey()},_.pick(j,_.keys(d.prototype.defaults))));g.prototype.initialize.call(this,j);this.panelStack=[]},loadCurrentHistory:function(k){var j=this;return this.loadHistoryWithHDADetails("current",k).then(function(m,l){j.trigger("current-history",j)})},switchToHistory:function(m,l){var j=this,k=function(){return jQuery.ajax({url:galaxy_config.root+"api/histories/"+m+"/set_as_current",method:"PUT"})};return this.loadHistoryWithHDADetails(m,l,k).then(function(o,n){j.trigger("switched-history",j)})},createNewHistory:function(l){if(!Galaxy||!Galaxy.currUser||Galaxy.currUser.isAnonymous()){this.displayMessage("error",b("You must be logged in to create histories"));return $.when()}var j=this,k=function(){return jQuery.post(galaxy_config.root+"api/histories",{current:true})};return this.loadHistory(undefined,l,k).then(function(n,m){j.trigger("new-history",j)})},setModel:function(k,j,l){g.prototype.setModel.call(this,k,j,l);if(this.model){this.log("checking for updates");this.model.checkForUpdates()}return this},_setUpModelEventHandlers:function(){g.prototype._setUpModelEventHandlers.call(this);if(Galaxy&&Galaxy.quotaMeter){this.listenTo(this.model,"change:nice_size",function(){Galaxy.quotaMeter.update()})}this.model.hdas.on("state:ready",function(k,l,j){if((!k.get("visible"))&&(!this.storage.get("show_hidden"))){this.removeHdaView(this.hdaViews[k.id])}},this)},render:function(l,m){this.log("render:",l,m);l=(l===undefined)?(this.fxSpeed):(l);var j=this,k;if(this.model){k=this.renderModel()}else{k=this.renderWithoutModel()}$(j).queue("fx",[function(n){if(l&&j.$el.is(":visible")){j.$el.fadeOut(l,n)}else{n()}},function(n){j.$el.empty();if(k){j.$el.append(k.children());j.renderBasedOnPrefs()}n()},function(n){if(l&&!j.$el.is(":visible")){j.$el.fadeIn(l,n)}else{n()}},function(n){if(m){m.call(this)}j.trigger("rendered",this);n()}]);return this},renderBasedOnPrefs:function(){if(this.preferences.get("searching")){this.toggleSearchControls(0,true)}},_renderEmptyMsg:function(l){var k=this,j=k.$emptyMessage(l),m=$(".toolMenuContainer");if((_.isEmpty(k.hdaViews)&&!k.searchFor)&&(Galaxy&&Galaxy.upload&&m.size())){j.empty();j.html([b("This history is empty"),". ",b("You can "),'<a class="uploader-link" href="javascript:void(0)">',b("load your own data"),"</a>",b(" or "),'<a class="get-data-link" href="javascript:void(0)">',b("get data from an external source"),"</a>"].join(""));j.find(".uploader-link").click(function(n){Galaxy.upload._eventShow(n)});j.find(".get-data-link").click(function(n){m.parent().scrollTop(0);m.find('span:contains("Get Data")').click()});j.show()}else{g.prototype._renderEmptyMsg.call(this,l)}return this},toggleSearchControls:function(k,j){var l=g.prototype.toggleSearchControls.call(this,k,j);this.preferences.set("searching",l)},_renderTags:function(j){var k=this;g.prototype._renderTags.call(this,j);if(this.preferences.get("tagsEditorShown")){this.tagsEditor.toggle(true)}this.tagsEditor.on("hiddenUntilActivated:shown hiddenUntilActivated:hidden",function(l){k.preferences.set("tagsEditorShown",l.hidden)})},_renderAnnotation:function(j){var k=this;g.prototype._renderAnnotation.call(this,j);if(this.preferences.get("annotationEditorShown")){this.annotationEditor.toggle(true)}this.annotationEditor.on("hiddenUntilActivated:shown hiddenUntilActivated:hidden",function(l){k.preferences.set("annotationEditorShown",l.hidden)})},_setUpHdaListeners:function(j){g.prototype._setUpHdaListeners.call(this,j)},_addCollectionPanel:function(k){var l=this;var j=new (this._getCollectionPanelClass(k))({model:k,HDAViewClass:this.HDAViewClass});l.panelStack.push(j);l.$el.hide().parent().append(j.$el);j.on("collection-close",function(){l.$el.fadeIn(l.fxSpeed);l.panelStack.pop()});if(!j.model.get("elements")){var m=j.model.fetch();m.done(function(){j.render()})}else{j.render()}},_getCollectionPanelClass:function(j){return a.CollectionPanel},connectToQuotaMeter:function(j){if(!j){return this}this.listenTo(j,"quota:over",this.showQuotaMessage);this.listenTo(j,"quota:under",this.hideQuotaMessage);this.on("rendered rendered:initial",function(){if(j&&j.isOverQuota()){this.showQuotaMessage()}});return this},showQuotaMessage:function(){var j=this.$el.find(".quota-message");if(j.is(":hidden")){j.slideDown(this.fxSpeed)}},hideQuotaMessage:function(){var j=this.$el.find(".quota-message");if(!j.is(":hidden")){j.slideUp(this.fxSpeed)}},connectToOptionsMenu:function(j){if(!j){return this}this.on("new-storage",function(l,k){if(j&&l){j.findItemByHtml(b("Include Deleted Datasets")).checked=l.get("show_deleted");j.findItemByHtml(b("Include Hidden Datasets")).checked=l.get("show_hidden")}});return this},toString:function(){return"CurrentHistoryPanel("+((this.model)?(this.model.get("name")):(""))+")"}});return{CurrentHistoryPanel:i}});